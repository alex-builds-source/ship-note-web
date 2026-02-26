const GH_API = "https://api.github.com";

export function parseRepoInput(input) {
  const raw = (input || "").trim();
  if (!raw) throw new Error("repo is required");

  const simple = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (simple) return { owner: simple[1], repo: simple[2].replace(/\.git$/i, "") };

  let value = raw;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid repository URL");
  }

  if (url.hostname !== "github.com") throw new Error("only github.com repositories are supported");

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("repository URL must include owner and repo");

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  return { owner, repo };
}

function canonical(text) {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSubject(subject) {
  const out = subject.replace(/^(feat|fix|docs|refactor|test|chore)(\([^)]*\))?!?:\s*/i, "").trim();
  return out || subject;
}

function lowSignal(subject) {
  const s = subject.toLowerCase().trim();
  if (s.startsWith("docs:")) return ["devlog", "release notes", "changelog"].some((t) => s.includes(t));
  if (s.startsWith("chore:")) {
    return ["release", "version", "dependency", "dependencies", "changelog"].some((t) => s.includes(t));
  }
  return false;
}

export function extractChangelogBullets(markdown, maxItems = 6) {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);

  let start = null;
  let end = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith("## ")) {
      start = i + 1;
      break;
    }
  }
  if (start !== null) {
    for (let j = start; j < lines.length; j += 1) {
      if (lines[j].trim().startsWith("## ")) {
        end = j;
        break;
      }
    }
  }

  const scan = start === null ? lines : lines.slice(start, end);
  const out = [];
  for (const line of scan) {
    if (!line.startsWith("- ")) continue;
    const item = line.slice(2).trim();
    if (!item) continue;
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

function dedupeBullets(commitSubjects, changelogItems, maxBullets) {
  const seen = new Set();
  const out = [];

  for (const subject of commitSubjects) {
    const item = normalizeSubject(subject);
    const key = canonical(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(`- ${item}`);
    if (out.length >= maxBullets) return out;
  }

  for (const item of changelogItems) {
    const key = canonical(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(`- ${item}`);
    if (out.length >= maxBullets) return out;
  }

  return out;
}

export function renderDraft({ repo, baseRef, targetRef = "HEAD", commitSubjects, changelogItems, preset = "standard", repoUrl, releaseUrl }) {
  const mode = preset === "short" ? "short" : "standard";

  let subjects = [...commitSubjects];
  let changelog = [...changelogItems];

  if (mode === "short") {
    const filtered = subjects.filter((s) => !lowSignal(s));
    if (filtered.length > 0) {
      subjects = filtered;
    } else if (subjects.length > 0 && changelog.length > 0) {
      // avoid stale carryover when only low-signal commits are present
      subjects = [];
      changelog = [];
    }
  }

  const maxBullets = mode === "short" ? 4 : 10;
  const bullets = dedupeBullets(subjects, changelog, maxBullets);

  const title = mode === "short" ? `# ${repo} update` : `# ${repo} release draft`;
  const whatShipped = bullets.length > 0 ? bullets.join("\n") : "- No commits or changelog bullets found for selected range.";

  const rangeLabel = baseRef ? `${baseRef}..${targetRef}` : `${targetRef}`;
  const whyLine = `- Captures ${commitSubjects.length} commit(s) from \`${rangeLabel}\` with changelog context when available.`;

  const links = [
    `- Repo: ${repoUrl}`,
    releaseUrl ? `- Release: ${releaseUrl}` : null,
  ].filter(Boolean);

  return [
    title,
    "",
    "## What shipped",
    whatShipped,
    "",
    "## Why it matters",
    whyLine,
    "",
    "## Links",
    ...links,
    "",
  ].join("\n");
}

async function ghFetch(path, token) {
  const headers = {
    "User-Agent": "ship-note-web",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${GH_API}${path}`, { headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub API ${resp.status}: ${text.slice(0, 180)}`);
  }
  return resp.json();
}

async function fetchChangelogContent(owner, repo, token, ref) {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/contents/CHANGELOG.md?ref=${encodeURIComponent(ref)}`, token);
    if (!data?.content) return "";
    const binary = atob(String(data.content).replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export async function buildDraftFromGitHub({ repoInput, preset = "standard", baseRef, targetRef, releaseUrl, token }) {
  const { owner, repo } = parseRepoInput(repoInput);
  const repoUrl = `https://github.com/${owner}/${repo}`;

  let resolvedBase = (baseRef || "").trim();
  if (!resolvedBase) {
    const tags = await ghFetch(`/repos/${owner}/${repo}/tags?per_page=1`, token);
    resolvedBase = tags?.[0]?.name || "";
  }

  const resolvedTarget = (targetRef || "HEAD").trim() || "HEAD";
  let commitSubjects = [];

  if (resolvedBase) {
    const compare = await ghFetch(
      `/repos/${owner}/${repo}/compare/${encodeURIComponent(resolvedBase)}...${encodeURIComponent(resolvedTarget)}`,
      token,
    );
    commitSubjects = (compare.commits || []).map((c) => c?.commit?.message?.split("\n")[0]).filter(Boolean);
  } else {
    const commits = await ghFetch(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(resolvedTarget)}&per_page=20`, token);
    commitSubjects = (commits || []).map((c) => c?.commit?.message?.split("\n")[0]).filter(Boolean);
  }

  const changelogText = await fetchChangelogContent(owner, repo, token, resolvedTarget);
  let changelogItems = extractChangelogBullets(changelogText, preset === "short" ? 4 : 6);
  if (commitSubjects.length === 0) changelogItems = [];

  const markdown = renderDraft({
    repo,
    baseRef: resolvedBase,
    targetRef: resolvedTarget,
    commitSubjects,
    changelogItems,
    preset,
    repoUrl,
    releaseUrl,
  });

  return {
    repo: `${owner}/${repo}`,
    baseRef: resolvedBase || null,
    targetRef: resolvedTarget,
    preset,
    commitCount: commitSubjects.length,
    markdown,
  };
}

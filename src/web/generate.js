const GH_API = "https://api.github.com";
const GH_CACHE_TTL_MS = 30_000;
const GH_CACHE_MAX_ENTRIES = 200;
const ghResponseCache = globalThis.__shipNoteWebGhCache || (globalThis.__shipNoteWebGhCache = new Map());

const DESTINATIONS = new Set(["release", "update", "social", "internal"]);

function ghCacheKey(path, token) {
  return `${token ? "auth" : "anon"}:${path}`;
}

function trimGhCache() {
  if (ghResponseCache.size <= GH_CACHE_MAX_ENTRIES) return;
  const toDelete = ghResponseCache.size - GH_CACHE_MAX_ENTRIES;
  const keys = ghResponseCache.keys();
  for (let i = 0; i < toDelete; i += 1) {
    const key = keys.next().value;
    if (!key) break;
    ghResponseCache.delete(key);
  }
}

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
  return String(text || "")
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSubject(subject) {
  const out = String(subject || "").replace(/^(feat|fix|docs|refactor|test|chore|perf)(\([^)]*\))?!?:\s*/i, "").trim();
  return out || String(subject || "");
}

function classifySubject(subject) {
  const m = String(subject || "").trim().match(/^([a-z]+)(\([^)]*\))?!?:\s/i);
  if (!m) return "other";
  const kind = m[1].toLowerCase();
  if (["feat", "fix", "perf", "refactor", "docs", "chore", "test"].includes(kind)) return kind;
  return "other";
}

function commitScope(subject) {
  const m = String(subject || "").trim().match(/^[a-z]+\(([^)]+)\)!?:\s/i);
  return m ? m[1].toLowerCase() : "general";
}

function lowSignal(subject) {
  const s = String(subject || "").toLowerCase().trim();
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

function makeTitle(repo, preset, destination) {
  const short = preset === "short";
  const target = destination || "release";

  if (short) {
    if (target === "social") return `# ${repo} social update`;
    if (target === "internal") return `# ${repo} internal update`;
    return `# ${repo} update`;
  }

  if (target === "social") return `# ${repo} social draft`;
  if (target === "internal") return `# ${repo} internal release brief`;
  if (target === "update") return `# ${repo} update draft`;
  return `# ${repo} release draft`;
}

function maxBulletsFor(preset, destination) {
  if (preset === "short") {
    if (destination === "social") return 2;
    if (destination === "internal") return 4;
    return 3;
  }

  if (destination === "social") return 4;
  if (destination === "update") return 8;
  if (destination === "internal") return 8;
  return 10;
}

function sectionHeadings(destination) {
  if (destination === "social") {
    return {
      what: "## Post-ready bullets",
      links: "## Source links",
      why: "## Why this post matters",
    };
  }

  if (destination === "internal") {
    return {
      what: "## Internal highlights",
      links: "## References",
      why: "## Why it matters internally",
    };
  }

  if (destination === "update") {
    return {
      what: "## Update highlights",
      links: "## References",
      why: "## Why this update matters",
    };
  }

  return {
    what: "## What shipped",
    links: "## Links",
    why: "## Why it matters",
  };
}

function buildWhyLines({ subjects, fromCommit, fromChangelog, rangeLabel, destination }) {
  if (fromCommit === 0 && fromChangelog === 0) {
    return ["- No substantive draft items were found for this range; this may be a no-change or maintenance-only release."];
  }

  const lines = [`- Covers \`${rangeLabel}\` with ${fromCommit} commit-derived item(s).`];

  const counts = {
    feat: 0,
    fix: 0,
    perf: 0,
    refactor: 0,
    docs: 0,
    chore: 0,
    test: 0,
    other: 0,
  };

  for (const subject of subjects) counts[classifySubject(subject)] += 1;

  const impact = [];
  if (counts.feat) impact.push(`${counts.feat} feature ${counts.feat === 1 ? "addition" : "additions"}`);
  if (counts.fix) impact.push(`${counts.fix} bug ${counts.fix === 1 ? "fix" : "fixes"}`);
  if (counts.perf) impact.push(`${counts.perf} performance ${counts.perf === 1 ? "improvement" : "improvements"}`);

  if (impact.length > 0) {
    lines.push(`- Highlights ${impact.join(", ")} so readers can quickly understand user-facing impact.`);
  } else if (counts.docs >= Math.max(1, fromCommit - 1)) {
    lines.push("- Mostly documentation-oriented updates; useful for keeping usage guidance aligned.");
  } else if ((counts.chore + counts.test + counts.refactor) >= Math.max(1, fromCommit - 1)) {
    lines.push("- Mostly maintenance-oriented updates; useful for communicating stability and release hygiene.");
  } else {
    lines.push("- Distills raw commit/changelog data into a concise summary so readers can triage changes faster.");
  }

  if (fromChangelog > 0) {
    lines.push(`- Adds ${fromChangelog} changelog item(s) when commit subjects alone miss context.`);
  }

  if (destination === "social") {
    lines.push("- Optimized for quick cross-channel sharing with minimal rewrite effort.");
  } else if (destination === "internal") {
    lines.push("- Emphasizes concise internal communication for team context and handoffs.");
  }

  return lines;
}

function buildDraftModel({
  repo,
  baseRef,
  targetRef = "HEAD",
  commits,
  changelogItems,
  preset = "standard",
  destination = "release",
  includeWhy = false,
  repoUrl,
  releaseUrl,
}) {
  const mode = preset === "short" ? "short" : "standard";
  const channel = DESTINATIONS.has(destination) ? destination : "release";

  let activeCommits = [...commits];
  let activeChangelog = [...changelogItems];

  if (mode === "short") {
    const filtered = activeCommits.filter((c) => !lowSignal(c.subject));
    if (filtered.length > 0) {
      activeCommits = filtered;
    } else if (activeCommits.length > 0 && activeChangelog.length > 0) {
      // avoid stale carryover when only low-signal commits are present
      activeCommits = [];
      activeChangelog = [];
    }
  }

  const maxBullets = maxBulletsFor(mode, channel);
  const seen = new Set();
  const selected = [];

  for (const c of activeCommits) {
    const text = normalizeSubject(c.subject);
    const key = canonical(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push({
      source: "commit",
      line: `- ${text}`,
      text,
      sha: c.sha,
      type: classifySubject(c.subject),
      scope: commitScope(c.subject),
    });
    if (selected.length >= maxBullets) break;
  }

  if (selected.length < maxBullets) {
    for (const item of activeChangelog) {
      const key = canonical(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push({ source: "changelog", line: `- ${item}`, text: item });
      if (selected.length >= maxBullets) break;
    }
  }

  const fromCommit = selected.filter((x) => x.source === "commit").length;
  const fromChangelog = selected.filter((x) => x.source === "changelog").length;

  const whatShippedLines = selected.length > 0
    ? selected.map((x) => x.line)
    : ["- No commits or changelog bullets found for selected range."];

  const rangeLabel = baseRef ? `${baseRef}..${targetRef}` : `${targetRef}`;
  const whyItMatters = buildWhyLines({
    subjects: activeCommits.map((c) => c.subject),
    fromCommit,
    fromChangelog,
    rangeLabel,
    destination: channel,
  });

  const title = makeTitle(repo, mode, channel);
  const links = [
    `- Repo: ${repoUrl}`,
    releaseUrl ? `- Release: ${releaseUrl}` : null,
  ].filter(Boolean);

  const headings = sectionHeadings(channel);

  const sections = {
    title,
    what_shipped: whatShippedLines,
    why_it_matters: includeWhy ? whyItMatters : [],
    links,
  };

  const markdownParts = [
    title,
    "",
    headings.what,
    whatShippedLines.join("\n"),
    "",
  ];

  if (includeWhy) {
    markdownParts.push(headings.why, ...whyItMatters, "");
  }

  markdownParts.push(headings.links, ...links, "");
  const markdown = markdownParts.join("\n");

  return {
    markdown,
    sections,
    items: selected.map((x) => {
      if (x.source === "commit") {
        return {
          source: "commit",
          text: x.text,
          sha: x.sha,
          type: x.type,
          scope: x.scope,
        };
      }
      return { source: "changelog", text: x.text };
    }),
    stats: {
      raw_commit_count: commits.length,
      selected_commit_count: activeCommits.length,
      commit_items_used: fromCommit,
      changelog_items_used: fromChangelog,
      bullet_line_count: selected.length,
    },
  };
}

export function renderDraft({ repo, baseRef, targetRef = "HEAD", commitSubjects, changelogItems, preset = "standard", destination = "release", includeWhy = false, repoUrl, releaseUrl }) {
  const commits = (commitSubjects || []).map((subject, idx) => ({ sha: `local-${idx}`, subject }));
  return buildDraftModel({
    repo,
    baseRef,
    targetRef,
    commits,
    changelogItems,
    preset,
    destination,
    includeWhy,
    repoUrl,
    releaseUrl,
  }).markdown;
}

async function ghFetch(path, token) {
  const key = ghCacheKey(path, token);
  const now = Date.now();
  const cached = ghResponseCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  if (cached) ghResponseCache.delete(key);

  const headers = {
    "User-Agent": "ship-note-web",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const promise = (async () => {
    const resp = await fetch(`${GH_API}${path}`, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`GitHub API ${resp.status}: ${text.slice(0, 200)}`);
      err.status = resp.status;
      err.path = path;
      err.rateLimitRemaining = resp.headers.get("x-ratelimit-remaining");
      err.rateLimitReset = resp.headers.get("x-ratelimit-reset");
      throw err;
    }
    return resp.json();
  })();

  ghResponseCache.set(key, { expiresAt: now + GH_CACHE_TTL_MS, promise });
  trimGhCache();

  promise.catch(() => {
    const active = ghResponseCache.get(key);
    if (active?.promise === promise) ghResponseCache.delete(key);
  });

  return promise;
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

export async function buildDraftFromGitHub({ repoInput, preset = "standard", destination = "release", includeWhy = false, baseRef, targetRef, releaseUrl, token }) {
  const { owner, repo } = parseRepoInput(repoInput);
  const repoName = `${owner}/${repo}`;
  const repoUrl = `https://github.com/${repoName}`;

  const mode = preset === "short" ? "short" : "standard";
  const channel = DESTINATIONS.has(destination) ? destination : "release";

  const resolvedTarget = (targetRef || "HEAD").trim() || "HEAD";
  const changelogPromise = fetchChangelogContent(owner, repo, token, resolvedTarget);

  let resolvedBase = (baseRef || "").trim();
  if (!resolvedBase) {
    const tags = await ghFetch(`/repos/${owner}/${repo}/tags?per_page=1`, token);
    resolvedBase = tags?.[0]?.name || "";
  }

  let commits = [];
  if (resolvedBase) {
    const compare = await ghFetch(
      `/repos/${owner}/${repo}/compare/${encodeURIComponent(resolvedBase)}...${encodeURIComponent(resolvedTarget)}`,
      token,
    );
    commits = (compare.commits || [])
      .map((c) => ({ sha: c?.sha || "", subject: c?.commit?.message?.split("\n")[0] || "" }))
      .filter((c) => c.subject);
  } else {
    const ghCommits = await ghFetch(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(resolvedTarget)}&per_page=20`, token);
    commits = (ghCommits || [])
      .map((c) => ({ sha: c?.sha || "", subject: c?.commit?.message?.split("\n")[0] || "" }))
      .filter((c) => c.subject);
  }

  let changelogItems = [];
  if (commits.length > 0) {
    const changelogText = await changelogPromise;
    changelogItems = extractChangelogBullets(changelogText, mode === "short" ? 4 : 6);
  }

  const model = buildDraftModel({
    repo,
    baseRef: resolvedBase,
    targetRef: resolvedTarget,
    commits,
    changelogItems,
    preset: mode,
    destination: channel,
    includeWhy: Boolean(includeWhy),
    repoUrl,
    releaseUrl,
  });

  const rangeSpec = resolvedBase ? `${resolvedBase}..${resolvedTarget}` : resolvedTarget;
  const payload = {
    schema_version: "1.0",
    repo: {
      name: repoName,
      url: repoUrl,
    },
    range: {
      base_ref: resolvedBase || null,
      target_ref: resolvedTarget,
      range_spec: rangeSpec,
    },
    options: {
      preset: mode,
      group_by: "type",
      destination: channel,
      include_why: Boolean(includeWhy),
    },
    stats: model.stats,
    sections: model.sections,
    items: model.items,
    markdown: model.markdown,

    // Legacy aliases for transitional compatibility.
    schemaVersion: "1.0",
    baseRef: resolvedBase || null,
    targetRef: resolvedTarget,
    rangeSpec,
    preset: mode,
    destination: channel,
    includeWhy: Boolean(includeWhy),
    commitCount: commits.length,
  };

  return payload;
}

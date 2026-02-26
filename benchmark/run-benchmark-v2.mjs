import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildDraftFromGitHub } from "../src/web/generate.js";

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No GitHub token available.");
  }
}

const TOKEN = getToken();

async function ghApi(path, { method = "GET", body } = {}) {
  const resp = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ship-note-web-benchmark-v2",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!resp.ok) throw new Error(`GitHub API ${resp.status}: ${JSON.stringify(data).slice(0, 220)}`);
  return data;
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/`/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(s) {
  return new Set(normalize(s).split(" ").filter((w) => w.length >= 3));
}

function dice(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

function bullets(md) {
  return String(md || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
}

function coverage(referenceText, candidateText) {
  const refs = bullets(referenceText);
  if (!refs.length) return 0.5;
  const out = normalize(candidateText);
  let hits = 0;
  for (const r of refs) {
    const key = normalize(r);
    if (!key) continue;
    if (out.includes(key.slice(0, Math.min(30, key.length)))) hits += 1;
  }
  return hits / refs.length;
}

function noiseRatio(text) {
  const lines = bullets(text);
  if (!lines.length) return 0;
  const noisy = lines.filter((line) => /devlog|release notes|changelog|bump depend|version bump|prepare release|publish v\d/i.test(line));
  return noisy.length / lines.length;
}

function composite({ similarity, coverageScore, noise, latencyMs, ok }) {
  const rel = ok ? 1 : 0;
  const latencyScore = Math.max(0, 1 - Math.min(latencyMs, 5000) / 5000);
  return 40 * similarity + 30 * coverageScore + 20 * (1 - noise) + 10 * ((rel + latencyScore) / 2);
}

async function getReleaseBody(repo, targetTag) {
  const [owner, name] = repo.split("/");
  try {
    const rel = await ghApi(`/repos/${owner}/${name}/releases/tags/${encodeURIComponent(targetTag)}`);
    return rel?.body || "";
  } catch {
    return "";
  }
}

async function genGithubAuto(repo, previousTag, targetTag) {
  const [owner, name] = repo.split("/");
  const started = performance.now();
  const out = await ghApi(`/repos/${owner}/${name}/releases/generate-notes`, {
    method: "POST",
    body: { tag_name: targetTag, previous_tag_name: previousTag },
  });
  return { text: out?.body || "", latencyMs: Math.round(performance.now() - started) };
}

async function genShipNote(repo, previousTag, targetTag) {
  const started = performance.now();
  const out = await buildDraftFromGitHub({
    repoInput: repo,
    baseRef: previousTag,
    targetRef: targetTag,
    preset: "standard",
    token: TOKEN,
    releaseUrl: `https://github.com/${repo}/releases/tag/${targetTag}`,
  });
  return { text: out.markdown || "", latencyMs: Math.round(performance.now() - started) };
}

const samples = JSON.parse(readFileSync(new URL("./samples_v2.json", import.meta.url), "utf8"));
const results = [];

for (const s of samples) {
  const reference = await getReleaseBody(s.repo, s.targetTag);
  const row = { ...s, referenceLength: reference.length, githubAuto: { ok: false }, shipNoteWeb: { ok: false }, winner: "tie" };

  try {
    const g = await genGithubAuto(s.repo, s.previousTag, s.targetTag);
    const similarity = dice(reference, g.text);
    const coverageScore = coverage(reference, g.text);
    const noise = noiseRatio(g.text);
    row.githubAuto = {
      ok: true, latencyMs: g.latencyMs, length: g.text.length, similarity, coverage: coverageScore, noise,
      score: composite({ similarity, coverageScore, noise, latencyMs: g.latencyMs, ok: true }),
    };
  } catch (e) {
    row.githubAuto = { ok: false, error: String(e.message || e) };
  }

  try {
    const w = await genShipNote(s.repo, s.previousTag, s.targetTag);
    const similarity = dice(reference, w.text);
    const coverageScore = coverage(reference, w.text);
    const noise = noiseRatio(w.text);
    row.shipNoteWeb = {
      ok: true, latencyMs: w.latencyMs, length: w.text.length, similarity, coverage: coverageScore, noise,
      score: composite({ similarity, coverageScore, noise, latencyMs: w.latencyMs, ok: true }),
    };
  } catch (e) {
    row.shipNoteWeb = { ok: false, error: String(e.message || e) };
  }

  if (row.githubAuto.ok && row.shipNoteWeb.ok) {
    if (row.shipNoteWeb.score > row.githubAuto.score) row.winner = "ship-note-web";
    else if (row.shipNoteWeb.score < row.githubAuto.score) row.winner = "github-auto";
  }

  console.log(`v2 ${s.id}: ${row.winner}`);
  results.push(row);
}

function avg(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

const comparable = results.filter((r) => r.githubAuto.ok && r.shipNoteWeb.ok);
const cohorts = [...new Set(results.map((r) => r.cohort))];

const byCohort = Object.fromEntries(cohorts.map((c) => {
  const rows = comparable.filter((r) => r.cohort === c);
  const winsShip = rows.filter((r) => r.winner === "ship-note-web").length;
  const winsGh = rows.filter((r) => r.winner === "github-auto").length;
  const ties = rows.length - winsShip - winsGh;
  return [c, {
    sampleCount: rows.length,
    wins: { shipNoteWeb: winsShip, githubAuto: winsGh, tie: ties, shipNoteWinRate: rows.length ? winsShip / rows.length : 0 },
    avgScores: {
      shipNoteWeb: avg(rows.map((r) => r.shipNoteWeb.score)),
      githubAuto: avg(rows.map((r) => r.githubAuto.score)),
    },
  }];
}));

const overall = {
  sampleCount: results.length,
  comparableCount: comparable.length,
  wins: {
    shipNoteWeb: comparable.filter((r) => r.winner === "ship-note-web").length,
    githubAuto: comparable.filter((r) => r.winner === "github-auto").length,
    tie: comparable.filter((r) => r.winner === "tie").length,
  },
  avgScores: {
    shipNoteWeb: avg(comparable.map((r) => r.shipNoteWeb.score)),
    githubAuto: avg(comparable.map((r) => r.githubAuto.score)),
  },
};

const payload = { overall, byCohort, results };
writeFileSync(new URL("./results_v2.json", import.meta.url), JSON.stringify(payload, null, 2));

const lines = ["# Benchmark V2 Summary", "", `- Samples: ${overall.sampleCount}`, `- Comparable: ${overall.comparableCount}`, "", "## Overall", `- ship-note-web wins: ${overall.wins.shipNoteWeb}`, `- github-auto wins: ${overall.wins.githubAuto}`, `- ties: ${overall.wins.tie}`, `- avg score (ship-note-web): ${overall.avgScores.shipNoteWeb.toFixed(2)}`, `- avg score (github-auto): ${overall.avgScores.githubAuto.toFixed(2)}`, "", "## By cohort"];
for (const [cohort, data] of Object.entries(byCohort)) {
  lines.push(`### ${cohort}`);
  lines.push(`- samples: ${data.sampleCount}`);
  lines.push(`- ship-note-web wins: ${data.wins.shipNoteWeb}`);
  lines.push(`- github-auto wins: ${data.wins.githubAuto}`);
  lines.push(`- ties: ${data.wins.tie}`);
  lines.push(`- ship-note-web win rate: ${(data.wins.shipNoteWinRate * 100).toFixed(1)}%`);
  lines.push(`- avg score (ship-note-web): ${data.avgScores.shipNoteWeb.toFixed(2)}`);
  lines.push(`- avg score (github-auto): ${data.avgScores.githubAuto.toFixed(2)}`);
  lines.push("");
}

writeFileSync(new URL("./SUMMARY_V2.md", import.meta.url), lines.join("\n"));
console.log("Wrote benchmark/results_v2.json and benchmark/SUMMARY_V2.md");

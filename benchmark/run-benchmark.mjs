import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildDraftFromGitHub } from "../src/web/generate.js";

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No GitHub token available. Set GITHUB_TOKEN or authenticate gh CLI.");
  }
}

const TOKEN = getToken();

async function ghApi(path, { method = "GET", body } = {}) {
  const resp = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ship-note-web-benchmark",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status}: ${JSON.stringify(data).slice(0, 280)}`);
  }
  return data;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s\n-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s) {
  const words = normalize(s).split(" ").filter((w) => w.length >= 3);
  return new Set(words);
}

function dice(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

function bullets(md) {
  return String(md || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function coverage(referenceText, candidateText) {
  const refs = bullets(referenceText);
  if (refs.length === 0) return 0.5;
  const out = normalize(candidateText);
  let hits = 0;
  for (const r of refs) {
    const key = normalize(r);
    if (!key) continue;
    if (out.includes(key.slice(0, Math.min(key.length, 32)))) hits += 1;
  }
  return hits / refs.length;
}

function noiseRatio(text) {
  const lines = bullets(text);
  if (lines.length === 0) return 0;
  const noisy = lines.filter((line) => /devlog|release notes|changelog|bump depend|version bump|prepare release|publish v\d/i.test(line));
  return noisy.length / lines.length;
}

function composite({ similarity, coverageScore, noise, latencyMs, ok }) {
  const rel = ok ? 1 : 0;
  const latencyScore = Math.max(0, 1 - Math.min(latencyMs, 5000) / 5000);
  return (
    40 * similarity +
    30 * coverageScore +
    20 * (1 - noise) +
    10 * ((rel + latencyScore) / 2)
  );
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
  const payload = { tag_name: targetTag, previous_tag_name: previousTag };
  const out = await ghApi(`/repos/${owner}/${name}/releases/generate-notes`, { method: "POST", body: payload });
  const latencyMs = Math.round(performance.now() - started);
  return { text: out?.body || "", latencyMs };
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
  const latencyMs = Math.round(performance.now() - started);
  return { text: out.markdown || "", latencyMs };
}

const samples = JSON.parse(readFileSync(new URL("./samples.json", import.meta.url), "utf8"));
const results = [];

for (const sample of samples) {
  const referenceText = await getReleaseBody(sample.repo, sample.targetTag);

  const row = {
    ...sample,
    referenceLength: referenceText.length,
    githubAuto: { ok: false },
    shipNoteWeb: { ok: false },
    winner: "tie",
  };

  try {
    const out = await genGithubAuto(sample.repo, sample.previousTag, sample.targetTag);
    const similarity = dice(referenceText, out.text);
    const coverageScore = coverage(referenceText, out.text);
    const noise = noiseRatio(out.text);
    row.githubAuto = {
      ok: true,
      latencyMs: out.latencyMs,
      length: out.text.length,
      similarity,
      coverage: coverageScore,
      noise,
      score: composite({ similarity, coverageScore, noise, latencyMs: out.latencyMs, ok: true }),
    };
  } catch (error) {
    row.githubAuto = { ok: false, error: String(error.message || error) };
  }

  try {
    const out = await genShipNote(sample.repo, sample.previousTag, sample.targetTag);
    const similarity = dice(referenceText, out.text);
    const coverageScore = coverage(referenceText, out.text);
    const noise = noiseRatio(out.text);
    row.shipNoteWeb = {
      ok: true,
      latencyMs: out.latencyMs,
      length: out.text.length,
      similarity,
      coverage: coverageScore,
      noise,
      score: composite({ similarity, coverageScore, noise, latencyMs: out.latencyMs, ok: true }),
    };
  } catch (error) {
    row.shipNoteWeb = { ok: false, error: String(error.message || error) };
  }

  if (row.githubAuto.ok && row.shipNoteWeb.ok) {
    if (row.shipNoteWeb.score > row.githubAuto.score) row.winner = "ship-note-web";
    else if (row.shipNoteWeb.score < row.githubAuto.score) row.winner = "github-auto";
  }

  results.push(row);
  console.log(`bench ${sample.id}: winner=${row.winner}`);
}

const both = results.filter((r) => r.githubAuto.ok && r.shipNoteWeb.ok);
const winsShip = both.filter((r) => r.winner === "ship-note-web").length;
const winsGh = both.filter((r) => r.winner === "github-auto").length;
const ties = both.length - winsShip - winsGh;

function avg(xs) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const summary = {
  sampleCount: results.length,
  comparableCount: both.length,
  wins: {
    shipNoteWeb: winsShip,
    githubAuto: winsGh,
    tie: ties,
    shipNoteWinRate: both.length ? winsShip / both.length : 0,
  },
  averages: {
    githubAutoScore: avg(both.map((r) => r.githubAuto.score)),
    shipNoteWebScore: avg(both.map((r) => r.shipNoteWeb.score)),
    githubAutoLatencyMs: avg(both.map((r) => r.githubAuto.latencyMs)),
    shipNoteWebLatencyMs: avg(both.map((r) => r.shipNoteWeb.latencyMs)),
  },
};

mkdirSync(new URL("./", import.meta.url), { recursive: true });
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify({ summary, results }, null, 2));

const md = [
  "# Benchmark Summary",
  "",
  `- Samples: ${summary.sampleCount}`,
  `- Comparable: ${summary.comparableCount}`,
  `- ship-note-web wins: ${summary.wins.shipNoteWeb}`,
  `- github-auto wins: ${summary.wins.githubAuto}`,
  `- ties: ${summary.wins.tie}`,
  `- ship-note-web win rate: ${(summary.wins.shipNoteWinRate * 100).toFixed(1)}%`,
  "",
  "## Average composite score",
  `- ship-note-web: ${summary.averages.shipNoteWebScore.toFixed(2)}`,
  `- github-auto: ${summary.averages.githubAutoScore.toFixed(2)}`,
  "",
  "## Average latency",
  `- ship-note-web: ${summary.averages.shipNoteWebLatencyMs.toFixed(1)} ms`,
  `- github-auto: ${summary.averages.githubAutoLatencyMs.toFixed(1)} ms`,
  "",
].join("\n");

writeFileSync(new URL("./SUMMARY.md", import.meta.url), md);
console.log("Wrote benchmark/results.json and benchmark/SUMMARY.md");

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractChangelogBullets,
  parseRepoInput,
  renderDraft,
} from "../src/web/generate.js";

test("parseRepoInput supports full URL and owner/repo", () => {
  assert.deepEqual(parseRepoInput("https://github.com/alex-builds-source/ship-note"), {
    owner: "alex-builds-source",
    repo: "ship-note",
  });
  assert.deepEqual(parseRepoInput("alex-builds-source/ship-note"), {
    owner: "alex-builds-source",
    repo: "ship-note",
  });
});

test("extractChangelogBullets prefers latest section and ignores nested bullets", () => {
  const md = `# Changelog\n\n## [0.2.0]\n- Added parser\n  - nested detail\n- Tightened docs\n\n## [0.1.0]\n- Old entry\n`;
  assert.deepEqual(extractChangelogBullets(md, 5), ["Added parser", "Tightened docs"]);
});

test("renderDraft short mode suppresses stale changelog carryover when all commits are low-signal", () => {
  const out = renderDraft({
    repo: "demo",
    baseRef: "v0.1.0",
    targetRef: "HEAD",
    commitSubjects: ["docs: publish v0.1.0 devlog", "chore: bump dependencies"],
    changelogItems: ["Added parser improvements"],
    preset: "short",
    repoUrl: "https://github.com/x/demo",
    releaseUrl: null,
  });

  assert.match(out, /No commits or changelog bullets found/);
  assert.doesNotMatch(out, /Added parser improvements/);
});

test("renderDraft includes deterministic sections", () => {
  const out = renderDraft({
    repo: "demo",
    baseRef: "v0.1.0",
    targetRef: "HEAD",
    commitSubjects: ["feat: add parser"],
    changelogItems: ["Added parser"],
    preset: "standard",
    includeWhy: true,
    repoUrl: "https://github.com/x/demo",
    releaseUrl: "https://github.com/x/demo/releases/tag/v0.1.1",
  });

  assert.match(out, /^# demo release draft/m);
  assert.match(out, /## What shipped/);
  assert.match(out, /## Why it matters/);
  assert.match(out, /## Links/);
});

test("renderDraft supports destination-specific title", () => {
  const out = renderDraft({
    repo: "demo",
    baseRef: "v0.1.0",
    targetRef: "v0.1.1",
    commitSubjects: ["feat: add parser"],
    changelogItems: [],
    preset: "short",
    destination: "social",
    repoUrl: "https://github.com/x/demo",
    releaseUrl: null,
  });

  assert.match(out, /^# demo social update/m);
});

test("renderDraft omits why section by default", () => {
  const out = renderDraft({
    repo: "demo",
    baseRef: "v0.1.0",
    targetRef: "v0.1.1",
    commitSubjects: ["feat: add parser"],
    changelogItems: [],
    preset: "standard",
    destination: "release",
    repoUrl: "https://github.com/x/demo",
    releaseUrl: null,
  });

  assert.doesNotMatch(out, /## Why it matters/);
});

test("renderDraft why section is impact-focused, not placeholder wording", () => {
  const out = renderDraft({
    repo: "demo",
    baseRef: "v0.1.0",
    targetRef: "v0.1.1",
    commitSubjects: ["feat: add parser", "fix: handle null"],
    changelogItems: ["Added parser", "Fixed null crash"],
    preset: "standard",
    includeWhy: true,
    repoUrl: "https://github.com/x/demo",
    releaseUrl: null,
  });

  assert.match(out, /Highlights .*feature addition.*bug fix/i);
  assert.doesNotMatch(out, /with changelog context when available/i);
});

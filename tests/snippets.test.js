import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

test("generated snippets are up to date", () => {
  assert.doesNotThrow(() => {
    execSync("node scripts/generate-snippets.mjs --check", { stdio: "pipe" });
  });
});

test("legacy root-level snippet files are absent", () => {
  const root = process.cwd();
  const legacy = [
    "docs/snippets/request.json",
    "docs/snippets/response.json",
    "docs/snippets/curl.sh",
    "docs/snippets/python.py",
    "docs/snippets/javascript.mjs",
  ];

  for (const rel of legacy) {
    assert.equal(existsSync(resolve(root, rel)), false, `legacy snippet should not exist: ${rel}`);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

test("generated snippets are up to date", () => {
  assert.doesNotThrow(() => {
    execSync("node scripts/generate-snippets.mjs --check", { stdio: "pipe" });
  });
});

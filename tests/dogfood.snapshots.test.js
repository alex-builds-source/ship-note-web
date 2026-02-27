import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test("dogfood snapshots generate expected destination markers", () => {
  execSync("node scripts/dogfood-destinations.mjs", { stdio: "pipe" });

  const root = process.cwd();
  const socialPath = resolve(root, "docs/dogfood/latest/ship-note-range.social.short.md");
  const updatePath = resolve(root, "docs/dogfood/latest/ship-note-range.update.standard.md");
  const internalPath = resolve(root, "docs/dogfood/latest/ship-note-range.internal.standard.with-why.md");

  assert.equal(existsSync(socialPath), true);
  assert.equal(existsSync(updatePath), true);
  assert.equal(existsSync(internalPath), true);

  const social = readFileSync(socialPath, "utf8");
  const update = readFileSync(updatePath, "utf8");
  const internal = readFileSync(internalPath, "utf8");

  assert.match(social, /## Post-ready bullets/);
  assert.doesNotMatch(social, /## Why it matters/);

  assert.match(update, /## Update highlights/);

  assert.match(internal, /## Internal highlights/);
  assert.match(internal, /## Why it matters internally/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const fixturesDir = resolve(root, "docs/fixtures");
const indexPath = resolve(fixturesDir, "index.json");

const REQUIRED_RESPONSE_KEYS = [
  "ok",
  "schema_version",
  "repo",
  "range",
  "options",
  "stats",
  "sections",
  "items",
  "markdown",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("fixture index has unique ids and valid paths", () => {
  const index = readJson(indexPath);
  assert.ok(Array.isArray(index.fixtures));
  assert.ok(index.fixtures.length >= 3);

  const ids = new Set();
  for (const entry of index.fixtures) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.equal(typeof entry.path, "string");
    assert.ok(entry.path.length > 0);
    assert.ok(!ids.has(entry.id), `duplicate fixture id: ${entry.id}`);
    ids.add(entry.id);
  }
});

test("fixtures satisfy minimal contract requirements", () => {
  const index = readJson(indexPath);

  for (const entry of index.fixtures) {
    const fixture = readJson(resolve(fixturesDir, entry.path));

    assert.equal(fixture.id, entry.id);
    assert.equal(typeof fixture.description, "string");
    assert.ok(Array.isArray(fixture.tags));
    assert.equal(typeof fixture.service?.endpoint, "string");

    const req = fixture.request;
    assert.ok(req && typeof req === "object");
    assert.ok(["standard", "short"].includes(req.preset));
    assert.ok(["release", "update", "social", "internal"].includes(req.destination));

    const resp = fixture.response;
    assert.ok(resp && typeof resp === "object");
    for (const key of REQUIRED_RESPONSE_KEYS) {
      assert.ok(key in resp, `fixture ${entry.id} missing response.${key}`);
    }
  }
});

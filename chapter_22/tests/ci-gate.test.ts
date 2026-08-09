import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("ci.yml is least-privilege and SHA-pinned", () => {
  const yml = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  assert.match(yml, /permissions:\s*\{\}/);
  assert.match(yml, /harden-runner@[0-9a-f]{40}/);
  assert.match(yml, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(yml, /npm_config_ignore_scripts/);
  assert.match(yml, /verify:no-lifecycle-scripts/);
  assert.match(yml, /verify:known-deps/);
  assert.doesNotMatch(yml, /actions\/checkout@v\d/);
});

test("verify-no-lifecycle-scripts gate is green on this package", () => {
  assert.ok(existsSync(resolve("scripts/verify-no-lifecycle-scripts.ts")));
  const r = spawnSync(process.execPath, ["scripts/verify-no-lifecycle-scripts.ts"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("verify-known-deps gate is green on this package", () => {
  assert.ok(existsSync(resolve("scripts/verify-known-deps.ts")));
  const r = spawnSync(process.execPath, ["scripts/verify-known-deps.ts"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

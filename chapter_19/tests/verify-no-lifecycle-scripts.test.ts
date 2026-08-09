import assert from "node:assert/strict";
import { test } from "node:test";
import { findForbiddenLifecycleScripts } from "../scripts/verify-no-lifecycle-scripts.ts";

test("a clean package.json passes", () => {
  const offending = findForbiddenLifecycleScripts({
    scripts: {
      build: "tsc",
      test: "node --test",
    },
  });
  assert.deepEqual(offending, []);
});

test("a postinstall hook is flagged", () => {
  const offending = findForbiddenLifecycleScripts({
    scripts: {
      postinstall: "node scripts/setup.js",
    },
  });
  assert.deepEqual(offending, ["postinstall"]);
});

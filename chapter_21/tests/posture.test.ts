import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

test("secureDefaults stays on with a finite body limit", () => {
  const app = buildApp();
  const posture = app.getSecurityPosture();
  assert.equal(posture.secureDefaults, true);
  assert.ok(posture.bodyLimitBytes > 0);
});

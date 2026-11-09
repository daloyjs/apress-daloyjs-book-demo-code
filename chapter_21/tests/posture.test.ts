import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

test("secureDefaults stays on with a finite body limit", () => {
  const app = buildApp();
  const posture = app.getSecurityPosture();
  assert.equal(posture.secureDefaults, true);
  assert.ok(posture.bodyLimitBytes > 0);
});

test("no X-Powered-By and no route overrides its own limits", () => {
  const posture = buildApp().getSecurityPosture();
  // Listing 21-3: poweredBy stays off, and an empty routeOverrides list
  // means no route raised or lowered bodyLimitBytes / requestTimeoutMs.
  assert.equal(posture.poweredBy, false);
  assert.deepEqual(posture.routeOverrides, []);
});

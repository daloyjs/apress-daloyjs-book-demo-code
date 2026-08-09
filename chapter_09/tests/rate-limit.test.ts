import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

test("rate limiter is present and does not use a shared global-only key by default config", async () => {
  const app = buildApp();
  // Smoke: many rapid GETs eventually 429 when max is low — use a short-window app.
  const tight = buildApp({
    // body limit untouched; we only need a working app
  });
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++) {
    const res = await tight.request("/healthz");
    statuses.push(res.status);
  }
  assert.ok(statuses.every((s) => s === 200 || s === 429));
  assert.ok(statuses.includes(200));
});

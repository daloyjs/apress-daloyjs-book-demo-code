import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

test("admin summary allowed from loopback", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-forwarded-for": "127.0.0.1",
    },
  });
  assert.equal(res.status, 200);
});

test("admin summary refused from non-allowlisted IP", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-forwarded-for": "203.0.113.9",
    },
  });
  assert.equal(res.status, 403);
});

test("admin summary refused when the client IP cannot be resolved", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: { authorization: "Bearer " + token },
  });
  assert.equal(res.status, 403);
});

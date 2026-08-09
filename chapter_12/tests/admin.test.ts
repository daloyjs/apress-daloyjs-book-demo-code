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
      "x-test-client-ip": "127.0.0.1",
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
      "x-test-client-ip": "203.0.113.9",
    },
  });
  assert.equal(res.status, 403);
});

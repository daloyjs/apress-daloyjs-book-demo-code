import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import {
  DEMO_ADMIN_CERT_HEADERS,
  mintDemoToken,
} from "../src/auth/demo-keys.ts";

test("admin summary allowed from loopback with verified client cert", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "127.0.0.1",
      ...DEMO_ADMIN_CERT_HEADERS,
    },
  });
  assert.equal(res.status, 200);
});

test("admin summary refused from non-allowlisted IP even with cert", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "203.0.113.9",
      ...DEMO_ADMIN_CERT_HEADERS,
    },
  });
  assert.equal(res.status, 403);
});

test("admin summary refused without client certificate", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "127.0.0.1",
    },
  });
  assert.equal(res.status, 401);
});

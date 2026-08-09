import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

const browser = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

test("create order without token is 401", async () => {
  const app = buildApp();
  const res = await app.request("/orders", {
    method: "POST",
    headers: browser,
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 401);
});

test("create order with write token is 201", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:write orders:read catalog:write", "user_alice");
  const res = await app.request("/orders", {
    method: "POST",
    headers: { ...browser, authorization: "Bearer " + token },
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 201);
});

test("read-only token cannot create orders", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_bob");
  const res = await app.request("/orders", {
    method: "POST",
    headers: { ...browser, authorization: "Bearer " + token },
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 403);
});

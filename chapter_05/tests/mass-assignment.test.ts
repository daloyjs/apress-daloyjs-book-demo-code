import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

test("a role field smuggled onto product creation is refused", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Evil", priceCents: 100, role: "admin" }),
  });
  assert.ok(res.status === 400 || res.status === 422, "got " + res.status);
});

test("create product happy path", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Notebook", priceCents: 900 }),
  });
  assert.equal(res.status, 201);
});

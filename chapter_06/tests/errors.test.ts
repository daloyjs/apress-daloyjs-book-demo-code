import assert from "node:assert/strict";
import test from "node:test";
import { runContractTests } from "@daloyjs/core/contract";
import { buildApp } from "../src/build-app.ts";

test("missing product returns 404 problem+json without stack", async () => {
  const app = buildApp();
  const res = await app.request("/products/does-not-exist");
  assert.equal(res.status, 404);
  const body = (await res.json()) as {
    status?: number;
    type?: string;
    stack?: string;
  };
  assert.equal(body.status, 404);
  assert.equal(body.stack, undefined);
  assert.match(String(body.type ?? ""), /not-found|error/i);
});

test("5xx detail is stripped in production, kept in development", async () => {
  const secretFragment = "payments-db at 10.0.4.12:5432";

  const devApp = buildApp({ env: "development", enableTestRoutes: true });
  const devRes = await devApp.request("/__test/crash", { method: "POST" });
  const devBody = (await devRes.json()) as { detail?: string; type?: string; title?: string; status?: number };
  assert.equal(devRes.status, 500);
  assert.ok(
    String(devBody.detail ?? "").includes(secretFragment) ||
      String(devBody.detail ?? "").includes("10.0.4.12"),
    "dev should keep internal detail",
  );

  const prodApp = buildApp({ env: "production", enableTestRoutes: true });
  const prodRes = await prodApp.request("/__test/crash", { method: "POST" });
  const prodBody = (await prodRes.json()) as {
    detail?: string;
    type?: string;
    title?: string;
    status?: number;
  };
  assert.equal(prodRes.status, 500);
  assert.equal(prodBody.detail, undefined);
  assert.ok(!JSON.stringify(prodBody).includes("10.0.4.12"));
  assert.equal(prodBody.type, devBody.type);
  assert.equal(prodBody.title, devBody.title);
  assert.equal(prodBody.status, devBody.status);
});

test("contract tests still pass with documented responses", async () => {
  const report = await runContractTests(buildApp());
  assert.equal(report.ok, true, JSON.stringify(report.issues?.slice(0, 3)));
});

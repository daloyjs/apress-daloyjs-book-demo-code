import assert from "node:assert/strict";
import test from "node:test";
import { signMessage } from "@daloyjs/core";
import { buildApp } from "../src/build-app.ts";
import { DEMO_PARTNER_HMAC } from "../src/auth/demo-keys.ts";

test("capstone posture keeps secureDefaults and finite body limit", () => {
  const app = buildApp();
  const posture = app.getSecurityPosture();
  assert.equal(posture.secureDefaults, true);
  assert.ok(posture.bodyLimitBytes > 0 && posture.bodyLimitBytes <= 1024 * 1024);
});

test("capstone still serves healthz under layered middleware and loadShedding", async () => {
  const app = buildApp();
  const res = await app.request("/healthz");
  assert.equal(res.status, 200);
});

test("partner webhook without signature is 401", async () => {
  const app = buildApp();
  const res = await app.request("/webhooks/partner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ eventType: "order.shipped", orderId: "ord_1" }),
  });
  assert.equal(res.status, 401);
});

test("partner webhook with valid HMAC signature is 202", async () => {
  const app = buildApp();
  const body = JSON.stringify({ eventType: "order.shipped", orderId: "ord_1" });
  // app.request resolves relative paths against http://test.local
  const url = "http://test.local/webhooks/partner";
  const created = Math.floor(Date.now() / 1000);
  const sig = await signMessage({
    method: "POST",
    url,
    alg: "hmac-sha256",
    key: DEMO_PARTNER_HMAC,
    keyid: "partner-demo",
    created,
  });
  const res = await app.request("/webhooks/partner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "signature-input": sig.signatureInput,
      signature: sig.signature,
    },
    body,
  });
  assert.equal(res.status, 202, await res.text());
});

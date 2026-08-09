import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

test("webhook registration refuses metadata IP via fetchGuard", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:write", "user_alice");
  const res = await app.request("/webhooks/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      authorization: "Bearer " + token,
    },
    body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data/" }),
  });
  assert.equal(res.status, 403);
});

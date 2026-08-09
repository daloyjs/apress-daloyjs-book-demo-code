import assert from "node:assert/strict";
import test from "node:test";
import { App, cors, jwk, session } from "@daloyjs/core";

test("wildcard origin with credentials refuses to construct", () => {
  assert.throws(
    () => cors({ origin: "*", credentials: true }),
    /cannot be combined with credentials/,
  );
});

test("jwk refuses symmetric HS algorithms at construction", () => {
  assert.throws(() => {
    // @ts-expect-error intentional bad alg for the guard
    jwk({ jwks: { keys: [] }, algorithms: ["HS256"] });
  }, /asymmetric|HS|algorithm/i);
});

test("session refuses a well-known weak secret when registered on a production app", () => {
  const app = new App({ env: "production" });
  assert.throws(() => {
    app.use(session({ secret: "changeme", cookieName: "sid" }));
  }, /placeholder|secret|changeme|short|weak|32/i);
});

test("production cors origin * alone is refused when registered", () => {
  const app = new App({ env: "production" });
  assert.throws(() => {
    app.use(cors({ origin: "*" }));
  }, /wildcard|origin|\*|production/i);
});

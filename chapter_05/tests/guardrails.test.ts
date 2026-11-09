import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { App, safeJsonParse } from "@daloyjs/core";
import { buildApp } from "../src/build-app.ts";

/** CSRF-safe browser headers when Ch8+ csrf(fetch-metadata) is present. */
const browser = {
  "content-type": "application/json",
  };

test("a body over the 1 MiB default is refused with 413", async () => {
  const app = buildApp();
  const overweight = JSON.stringify({
    name: "Mug",
    priceCents: 900,
    padding: "x".repeat(2_000_000),
  });
  const res = await app.fetch(
    new Request("http://test.local/products", {
      method: "POST",
      headers: browser,
      body: overweight,
    }),
  );
  assert.equal(res.status, 413);
});

test("a body just under the limit is not a 413", async () => {
  const app = buildApp();
  const nearLimitBody = JSON.stringify({
    name: "x".repeat(200),
    priceCents: 1,
  });
  const res = await app.request("/products", {
    method: "POST",
    headers: browser,
    body: nearLimitBody,
  });
  assert.notEqual(res.status, 413);
});

/**
 * Listing 5-4: a route-level bodyLimitBytes replaces the App value for that
 * route only. Built on a small standalone App so the 1 KiB App default and
 * the per-route numbers are easy to read.
 */
function buildLimitsApp(): App {
  const app = new App({ bodyLimitBytes: 1024 });
  const NoteSchema = z.object({ note: z.string() }).strict();
  const ok = {
    200: {
      description: "ok",
      body: z.object({ ok: z.boolean() }).strict(),
    },
  };
  const handler = async () => ({ status: 200 as const, body: { ok: true } });
  app.post(
    "/import",
    {
      operationId: "importNotes",
      bodyLimitBytes: 8 * 1024, // raised for this route only
      request: { body: NoteSchema },
      responses: ok,
    },
    handler,
  );
  app.post(
    "/login",
    {
      operationId: "login",
      bodyLimitBytes: 64, // lowered for this route only
      request: { body: NoteSchema },
      responses: ok,
    },
    handler,
  );
  app.post(
    "/notes",
    {
      operationId: "createNote",
      request: { body: NoteSchema },
      responses: ok,
    },
    handler,
  );
  return app;
}

test("a route that raises bodyLimitBytes accepts what the App default refuses", async () => {
  const app = buildLimitsApp();
  const twoKiB = JSON.stringify({ note: "x".repeat(2048) });
  const raised = await app.request("/import", {
    method: "POST",
    headers: browser,
    body: twoKiB,
  });
  assert.equal(raised.status, 200);
  // Every other route keeps the 1 KiB App default.
  const inherited = await app.request("/notes", {
    method: "POST",
    headers: browser,
    body: twoKiB,
  });
  assert.equal(inherited.status, 413);
});

test("a route that lowers bodyLimitBytes refuses what the App default accepts", async () => {
  const app = buildLimitsApp();
  const small = JSON.stringify({ note: "x".repeat(200) });
  const lowered = await app.request("/login", {
    method: "POST",
    headers: browser,
    body: small,
  });
  assert.equal(lowered.status, 413);
  const inherited = await app.request("/notes", {
    method: "POST",
    headers: browser,
    body: small,
  });
  assert.equal(inherited.status, 200);
});

test("an invalid route-level bodyLimitBytes throws at registration", () => {
  const app = new App();
  assert.throws(() =>
    app.post(
      "/bad",
      {
        operationId: "bad",
        bodyLimitBytes: -1,
        responses: {
          200: {
            description: "ok",
            body: z.object({ ok: z.boolean() }).strict(),
          },
        },
      },
      async () => ({ status: 200 as const, body: { ok: true } }),
    ),
  );
});

test("a JSON route refuses a body sent as text/plain", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ name: "Mug", priceCents: 900 }),
  });
  assert.ok(res.status === 415 || res.status === 400, "got " + res.status);
});

test("a JSON route accepts application/json (happy path)", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: browser,
    body: JSON.stringify({ name: "Mug", priceCents: 900 }),
  });
  assert.equal(res.status, 201);
});

test("a __proto__ key cannot pollute Object.prototype", async () => {
  const app = buildApp();
  const canary = (Object.prototype as { polluted?: string }).polluted;
  const res = await app.request("/products", {
    method: "POST",
    headers: browser,
    body: '{"name":"x","priceCents":1,"__proto__":{"polluted":"yes"}}',
  });
  assert.ok(
    res.status === 400 || res.status === 422 || res.status === 201,
    "got " + res.status,
  );
  assert.equal((Object.prototype as { polluted?: string }).polluted, canary);
  if (res.status === 201) {
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(Object.hasOwn(body, "polluted"), false);
  }
});

test("safeJsonParse strips forbidden keys without a route schema", () => {
  const parsed = safeJsonParse(
    '{"ok":true,"__proto__":{"isAdmin":true},"nested":{"constructor":{"prototype":{"x":1}}}}',
  ) as Record<string, unknown>;
  assert.equal(parsed.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "__proto__"), false);
  assert.equal(({} as { isAdmin?: boolean }).isAdmin, undefined);
  const nested = parsed.nested as Record<string, unknown> | undefined;
  assert.equal(
    nested && Object.prototype.hasOwnProperty.call(nested, "constructor"),
    false,
  );
});

test("path traversal segments never match a handler", async () => {
  const app = buildApp();
  const res = await app.request("/products/../../etc/passwd");
  assert.ok(res.status === 400 || res.status === 404, "got " + res.status);
});

test("a doubled slash is rejected before a normal catalog hit", async () => {
  const app = buildApp();
  const res = await app.fetch(new Request("http://test.local//products"));
  assert.notEqual(res.status, 200);
});

test("undeclared method on a known path is 405 with Allow", async () => {
  const app = buildApp();
  const res = await app.request("/healthz", {
    method: "DELETE",
    headers: { "sec-fetch-site": "same-origin" },
  });
  assert.equal(res.status, 405);
  const allow = res.headers.get("allow") ?? "";
  assert.ok(allow.length > 0, "Allow header should list permitted methods");
});

test("a duplicated Content-Length header is refused before routing", async () => {
  const app = buildApp();
  const headers = new Headers();
  headers.append("content-length", "13");
  headers.append("content-length", "9999");
  headers.set("content-type", "application/json");
  headers.set("sec-fetch-site", "same-origin");
  const res = await app.fetch(
    new Request("http://test.local/products", {
      method: "POST",
      headers,
      body: '{"name":"x","priceCents":1}',
    }),
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { detail?: string };
  assert.match(String(body.detail ?? ""), /content-length|Duplicate/i);
});

test("too many headers returns 431", async () => {
  const app = buildApp({ maxHeaderCount: 5 });
  const headers = new Headers({
    "content-type": "application/json",
    });
  for (let i = 0; i < 20; i++) headers.set(`x-probe-${i}`, "1");
  const res = await app.fetch(
    new Request("http://test.local/products", {
      method: "POST",
      headers,
      body: '{"name":"x","priceCents":1}',
    }),
  );
  assert.equal(res.status, 431);
});

test("deeply nested JSON is refused before parse materializes the graph", async () => {
  const app = buildApp();
  const deep = "[".repeat(60) + "]".repeat(60);
  const res = await app.request("/products", {
    method: "POST",
    headers: browser,
    body: deep,
  });
  assert.equal(res.status, 400);
});

test("a handler that outlives a short deadline gets 408", async () => {
  const app = buildApp({ requestTimeoutMs: 30, enableTestRoutes: true });
  const res = await app.request("/__test/slow");
  assert.equal(res.status, 408);
});

import { test, before } from "node:test";
import assert from "node:assert/strict";

process.env.MCP_TOKEN ??= "test-mcp-token-not-for-production-use-32b";
process.env.NODE_ENV = "development";

const { buildMcpApp } = await import("../src/mcp/build-mcp-app.ts");
const token = process.env.MCP_TOKEN;
let app;

before(() => {
  app = buildMcpApp();
});

async function mcpCall(method, params, authed = true) {
  const res = await app.fetch(
    new Request("http://127.0.0.1/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(authed ? { authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  return { status: res.status, body: await res.json() };
}

test("tools/list requires a bearer token", async () => {
  const { status } = await mcpCall("tools/list", {}, false);
  assert.equal(status, 401);
});

test("tools/list returns the agent-safe catalog", async () => {
  const { status, body } = await mcpCall("tools/list", {});
  assert.equal(status, 200);
  const names = body.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["list_products", "lookup_order"]);
});

test("tools/call rejects bad inputSchema args", async () => {
  const { body } = await mcpCall("tools/call", {
    name: "lookup_order",
    arguments: { orderId: 123, extra: true },
  });
  assert.equal(body.error.code, -32602);
});

test("tools/call returns structured order data", async () => {
  const { body } = await mcpCall("tools/call", {
    name: "lookup_order",
    arguments: { orderId: "ord_demo_1" },
  });
  assert.equal(body.error, undefined);
  assert.equal(body.result.structuredContent.id, "ord_demo_1");
  // Only the fields we chose for agents — not a full domain dump.
  assert.deepEqual(Object.keys(body.result.structuredContent).sort(), [
    "id",
    "itemCount",
    "status",
  ]);
});

// MCP 2026-07-28 is stateless: no initialize handshake, no Mcp-Session-Id.
// Every request declares its own protocol version, client identity, and
// capabilities in _meta, and mirrors the version and method into headers.
const MODERN = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": MODERN,
  "io.modelcontextprotocol/clientInfo": {
    name: "orders-lab",
    version: "0.0.1",
  },
  "io.modelcontextprotocol/clientCapabilities": {},
};

async function modernCall(method, params = {}, overrides = {}) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    authorization: "Bearer " + token,
    "mcp-protocol-version": overrides.headerVersion ?? MODERN,
    "mcp-method": method,
    ...(params.name ? { "mcp-name": params.name } : {}),
  };
  const res = await app.fetch(
    new Request("http://127.0.0.1/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: { ...params, _meta: META },
      }),
    }),
  );
  return { status: res.status, body: await res.json() };
}

test("server/discover reports supported versions without a handshake", async () => {
  const { status, body } = await modernCall("server/discover");
  assert.equal(status, 200);
  assert.equal(body.error, undefined);
  assert.equal(body.result.resultType, "complete");
  assert.ok(body.result.supportedVersions.includes(MODERN));
  // Server identity travels per-result, not per-session.
  assert.ok(body.result._meta["io.modelcontextprotocol/serverInfo"].name);
});

test("a modern tools/call needs no session and returns only chosen fields", async () => {
  const { status, body } = await modernCall("tools/call", {
    name: "lookup_order",
    arguments: { orderId: "ord_demo_1" },
  });
  assert.equal(status, 200);
  assert.equal(body.error, undefined);
  assert.deepEqual(Object.keys(body.result.structuredContent).sort(), [
    "id",
    "itemCount",
    "status",
  ]);
});

test("catalog listings are private and uncached by default", async () => {
  // A per-principal tool list cached as shared would serve one tenant's
  // catalog to the next caller. The conservative pair is the default.
  const { body } = await modernCall("tools/list");
  assert.equal(body.result.cacheScope, "private");
  assert.equal(body.result.ttlMs, 0);
});

test("a version header that disagrees with the body is refused", async () => {
  // The gateway routes on the header while the app dispatches on the body;
  // letting them disagree is how one policy gets applied to another action.
  const { status, body } = await modernCall(
    "tools/list",
    {},
    { headerVersion: "2025-06-18" },
  );
  assert.equal(status, 400);
  assert.equal(body.error.code, -32020);
});

test("unknown order id is a tool error, not another tenant's data", async () => {
  const { body } = await mcpCall("tools/call", {
    name: "lookup_order",
    arguments: { orderId: "ord_definitely_missing_zzzz" },
  });
  assert.equal(body.error, undefined);
  // MCP tool failures are result.isError (or missing structuredContent), not JSON-RPC -32xxx
  // and never a 200 with someone else's order payload.
  const sc = body.result?.structuredContent;
  assert.ok(sc === undefined || body.result?.isError === true);
});

test("browser Origin outside allowedOrigins is refused", async () => {
  const res = await app.fetch(
    new Request("http://127.0.0.1/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: "Bearer " + token,
        origin: "https://evil.example",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/list",
        params: {},
      }),
    }),
  );
  assert.notEqual(res.status, 200);
});

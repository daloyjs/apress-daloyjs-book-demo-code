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

test("initialize negotiates a protocol version", async () => {
  const { status, body } = await mcpCall("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "orders-lab", version: "0.0.1" },
  });
  assert.equal(status, 200);
  assert.equal(body.error, undefined);
  assert.ok(body.result?.protocolVersion || body.result?.serverInfo);
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

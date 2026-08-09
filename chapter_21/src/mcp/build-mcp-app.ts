import {
  App,
  bearerAuth,
  createMcpHandler,
  mcpRoutes,
  rateLimit,
  requestId,
  secureHeaders,
  timingSafeEqual,
  McpToolError,
} from "@daloyjs/core";
import { getOrderForOwner, listProducts } from "../domain/catalog-orders.ts";

/**
 * Dedicated MCP Streamable HTTP app (book Chapter 18).
 * Separate process/port from REST so agent tools get their own token and rate budget.
 */
export function buildMcpApp(): App {
  const MCP_TOKEN = process.env.MCP_TOKEN ?? "";
  if (MCP_TOKEN.length < 32) {
    throw new Error(
      "MCP_TOKEN must be set to a strong secret (>= 32 characters). " +
        "Generate one with: openssl rand -base64 48",
    );
  }

  const mcp = createMcpHandler({
    serverInfo: {
      name: "orders-api-mcp",
      title: "Orders API MCP",
      version: "0.18.0",
      description: "Agent-safe tools for catalog lookup and order status.",
    },
    instructions:
      "Use these tools to look up products and order status. " +
      "Never invent order ids. Prefer list_products before recommending SKUs.",
    // CLI hosts omit Origin. Browser MCP UIs must be listed here.
    allowedOrigins: ["https://claude.ai", "https://vscode.dev"],
    tools: [
      {
        name: "list_products",
        title: "List products",
        description: "List catalog products the shop currently sells.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 50 },
          },
          additionalProperties: false,
        },
        handler: async (args) => {
          const limit =
            typeof args.limit === "number" && Number.isInteger(args.limit)
              ? Math.min(50, Math.max(1, args.limit))
              : 20;
          const products = await listProducts({ limit });
          return {
            content: [
              {
                type: "text" as const,
                text: products
                  .map((p) => `${p.id}: ${p.name} (${p.priceCents} cents)`)
                  .join("\n"),
              },
            ],
            structuredContent: { products },
          };
        },
      },
      {
        name: "lookup_order",
        title: "Look up order",
        description:
          "Fetch one order by id for the demo shop principal. " +
          "Requires the order id the customer already knows.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "string", minLength: 1, maxLength: 64 },
          },
          required: ["orderId"],
          additionalProperties: false,
        },
        handler: async (args) => {
          const orderId = String(args.orderId ?? "");
          // Service token maps to one shop principal (see MCP_OWNER_ID).
          // Multi-tenant deploys: mint per-merchant tokens and look up ownerId.
          const ownerId = process.env.MCP_OWNER_ID ?? "user_alice";
          const order = await getOrderForOwner(orderId, ownerId);
          if (!order) {
            throw new McpToolError(`No order found for ${orderId}.`);
          }
          return {
            content: [
              {
                type: "text" as const,
                text: `Order ${order.id}: ${order.status}, ${order.items.length} items`,
              },
            ],
            structuredContent: {
              id: order.id,
              status: order.status,
              itemCount: order.items.length,
            },
          };
        },
      },
    ],
    resources: [
      {
        uri: "daloy://orders-api/catalog-schema",
        name: "catalog_schema",
        title: "Catalog schema",
        mimeType: "application/json",
        read: () => ({
          uri: "daloy://orders-api/catalog-schema",
          mimeType: "application/json",
          text: JSON.stringify({
            product: { id: "string", name: "string", priceCents: "number" },
          }),
        }),
      },
    ],
    prompts: [
      {
        name: "shipping_update",
        title: "Shipping update",
        description: "Draft a customer-facing shipping update for one order.",
        arguments: [{ name: "orderId", required: true }],
        get: (args) => ({
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text:
                  `Draft a short shipping update email for order ${String(args.orderId)}. ` +
                  `Use lookup_order first. Do not invent tracking numbers.`,
              },
            },
          ],
        }),
      },
    ],
  });

  const app = new App({
    env: process.env.NODE_ENV === "production" ? "production" : "development",
    bodyLimitBytes: 64 * 1024,
    requestTimeoutMs: 10_000,
    docs: false,
  });

  app.use(requestId());
  app.use(secureHeaders());
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 60,
      keyGenerator: (ctx) => ctx.state.clientIp ?? "unknown",
    }),
  );
  app.use(
    bearerAuth({
      realm: "orders-mcp",
      validate: (token) =>
        token.length === MCP_TOKEN.length && timingSafeEqual(token, MCP_TOKEN),
    }),
  );

  for (const route of mcpRoutes("/mcp", mcp)) {
    app.route(route);
  }

  return app;
}

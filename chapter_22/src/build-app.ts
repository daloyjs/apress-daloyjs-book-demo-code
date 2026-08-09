import { z } from "zod";
import {
  App,
  clientCertAuth,
  cors,
  createWebhookSender,
  csrf,
  every,
  fetchGuard,
  ipRestriction,
  jwk,
  rateLimit,
  requestId,
  secureHeaders,
} from "@daloyjs/core";
import type { AppOptions } from "@daloyjs/core";
import { autoBan } from "@daloyjs/core/auto-ban";
import { botGuard, WELL_KNOWN_BOTS } from "@daloyjs/core/bot-guard";
import { waf } from "@daloyjs/core/waf";
import {
  DEMO_AUDIENCE,
  DEMO_ISSUER,
  DEMO_JWKS,
} from "./auth/demo-keys.ts";
import { registerAdminRoutes } from "./routes/admin.ts";
import { registerCatalogRoutes } from "./routes/catalog.ts";
import { registerOrderRoutes } from "./routes/orders.ts";
import { registerWebhookRoutes } from "./routes/webhooks.ts";

/**
 * Chapter 22 capstone assembly — matches the book composite:
 * layered abuse controls, jwk, modular routes, admin mTLS+IP, webhook sender
 * decoration, partner httpSignatureAuth on one route, MCP as a separate process.
 *
 * Demo JWKS / demo HMAC / structured cert headers are offline test fixtures;
 * production uses an IdP JWKS URL, real mTLS, and env secrets.
 */
export function buildApp(
  overrides: Partial<AppOptions> & { enableTestRoutes?: boolean } = {},
): App {
  const { enableTestRoutes = false, ...appOpts } = overrides;
  const clientKey = (ctx: { state: { clientIp?: string } }) =>
    ctx.state.clientIp ?? "unknown";

  const verify = jwk({
    jwks: DEMO_JWKS,
    algorithms: ["ES256"],
    issuer: DEMO_ISSUER,
    audience: DEMO_AUDIENCE,
    realm: "orders-api",
  });

  const app = new App({
    bodyLimitBytes: 256 * 1024,
    requestTimeoutMs: 15_000,
    // Always on (book uses `true`). Under concurrent node:test workers the
    // ELU sampler often reports 1.0, so we disable utilization (0) and keep
    // a real event-loop delay threshold that still sheds under genuine hangs.
    loadShedding: {
      maxEventLoopDelayMs: 30_000,
      maxEventLoopUtilization: 0,
      sampleIntervalMs: 1_000,
      retryAfterSeconds: 10,
    },
    production: process.env.NODE_ENV === "production",
    openapi: { info: { title: "orders-api", version: "0.22.0" } },
    docs: process.env.NODE_ENV !== "production",
    ...appOpts,
  });

  app.use(requestId());
  app.use(secureHeaders());
  app.use(cors({ origin: ["https://shop.example.com"], credentials: true }));
  app.use(
    csrf({
      strategy: "fetch-metadata",
      allowedOrigins: ["https://shop.example.com"],
    }),
  );
  app.use(rateLimit({ windowMs: 60_000, max: 300, keyGenerator: clientKey }));
  app.use(autoBan({ keyGenerator: clientKey }));
  // verifiedBots (not a fictional `verify` key) + resolveIp so reverse-DNS
  // crawler checks can run. Empty User-Agent is blocked in production only:
  // app.request() unit tests omit UA; real browsers always send one.
  app.use(
    botGuard({
      verifiedBots: WELL_KNOWN_BOTS,
      resolveIp: (ctx) =>
        ctx.state.clientIp ??
        ctx.request.headers.get("x-test-client-ip") ??
        "127.0.0.1",
      blockEmptyUserAgent: process.env.NODE_ENV === "production",
    }),
  );
  app.use(waf());

  // Ch12: decorate before routes that may consume the sender.
  const senderFetch = fetchGuard({ allowLoopback: false, allowPrivate: false });
  app.decorate(
    "webhookSender",
    createWebhookSender({
      fetch: senderFetch,
      secret:
        process.env.WEBHOOK_SIGNING_SECRET ??
        "companion-demo-webhook-secret-not-for-production",
      maxAttempts: 1,
    }),
  );

  app.get(
    "/healthz",
    {
      operationId: "healthz",
      tags: ["Ops"],
      responses: {
        200: {
          description: "ok",
          body: z.object({ ok: z.literal(true), uptime: z.number() }),
        },
      },
    },
    async () => ({
      status: 200 as const,
      body: { ok: true as const, uptime: process.uptime() },
    }),
  );

  registerCatalogRoutes(app, { verify });
  registerOrderRoutes(app, { verify });
  registerWebhookRoutes(app, { verify, safeFetch: senderFetch });

  // Ch11: same App instance, separate trust boundary (IP + client cert).
  // Structured headers stand in for native mTLS under offline companion tests.
  app.group(
    "/admin",
    {
      hooks: every(
        ipRestriction({
          allow: ["127.0.0.1", "::1", "10.20.0.0/16"],
          resolveIp: (ctx) =>
            ctx.request.headers.get("x-test-client-ip") ?? "127.0.0.1",
        }),
        clientCertAuth({
          requireVerified: true,
          header: {
            format: "structured",
            subjectDN: "x-ssl-client-s-dn",
            issuerDN: "x-ssl-client-i-dn",
            verify: "x-ssl-client-verify",
          },
          allowIssuerCNs: ["orders-internal-ca"],
        }),
      ),
    },
    (admin) => {
      registerAdminRoutes(admin, { verify });
    },
  );

  if (enableTestRoutes) {
    app.get(
      "/__test/slow",
      {
        operationId: "testSlow",
        tags: ["test"],
        responses: {
          200: { description: "ok", body: z.object({ ok: z.literal(true) }) },
        },
      },
      async () => {
        await new Promise((r) => setTimeout(r, 200));
        return { status: 200 as const, body: { ok: true as const } };
      },
    );
    app.post(
      "/__test/crash",
      {
        operationId: "testCrash",
        tags: ["test"],
        responses: { 500: { description: "crash" } },
      },
      async () => {
        throw new Error("payments-db at 10.0.4.12:5432 refused connection");
      },
    );
  }

  return app;
}

export default buildApp;

import { z } from "zod";
import { App, rateLimit, requestId, secureHeaders } from "@daloyjs/core";

/**
 * Pure app factory (create-daloy shape). Chapter 3: healthz only; demo books route removed.
 */
export function buildApp(): App {
  const app = new App({
    bodyLimitBytes: 1024 * 1024,
    requestTimeoutMs: 5_000,
    production: process.env.NODE_ENV === "production",
    openapi: {
      info: { title: "orders-api", version: "0.3.0" },
      ...(process.env.PUBLIC_URL ? { servers: [{ url: process.env.PUBLIC_URL }] } : {}),
    },
    docs: true,
  });

  app.use(requestId());
  app.use(secureHeaders());
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));

  app.get(
    "/healthz",
    {
      operationId: "healthz",
      tags: ["Ops"],
      responses: {
        200: {
          description: "Service is healthy",
          body: z.object({ ok: z.literal(true), uptime: z.number() }),
        },
      },
    },
    async () => ({
      status: 200 as const,
      body: { ok: true as const, uptime: process.uptime() },
    }),
  );

  return app;
}

export default buildApp;

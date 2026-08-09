/**
 * Webhook routes (Ch12): outbound registration via fetchGuard, inbound
 * partner callbacks via RFC 9421 httpSignatureAuth.
 */
import {
  ForbiddenError,
  SsrfBlockedError,
  every,
  fetchGuard,
  httpSignatureAuth,
  requireScopes,
  type App,
  type Hooks,
} from "@daloyjs/core";
import { z } from "zod";
import { DEMO_PARTNER_HMAC } from "../auth/demo-keys.ts";
import { PartnerEventSchema, RegisterWebhookSchema } from "./schemas.ts";

export type WebhookRouteDeps = {
  verify: Hooks;
  safeFetch?: typeof fetch;
};

/**
 * Register webhook registration (SSRF-safe probe) and the partner push
 * endpoint that requires a valid HTTP Message Signature.
 */
export function registerWebhookRoutes(app: App, deps: WebhookRouteDeps): void {
  const { verify } = deps;
  const safeFetch =
    deps.safeFetch ?? fetchGuard({ allowLoopback: false, allowPrivate: false });

  app.post(
    "/webhooks/register",
    {
      operationId: "registerWebhook",
      tags: ["webhooks"],
      auth: { scheme: "bearer", scopes: ["orders:write"] },
      hooks: every(verify, requireScopes(["orders:write"])),
      request: { body: RegisterWebhookSchema },
      responses: {
        201: {
          description: "registered",
          body: z.object({ ok: z.literal(true), url: z.string() }),
        },
        403: { description: "ssrf blocked" },
        401: { description: "unauthorized" },
      },
    },
    async ({ body }) => {
      try {
        await safeFetch(body.url, { method: "HEAD" });
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          throw new ForbiddenError(`webhook URL blocked (${err.reason})`);
        }
        throw new ForbiddenError("webhook URL unreachable or refused");
      }
      return { status: 201 as const, body: { ok: true as const, url: body.url } };
    },
  );

  // Inbound partner callbacks: signature required (not global app.use — that
  // would break browser/JWT traffic). Matches the "one partner endpoint" in Ch22.
  const partnerAuth = httpSignatureAuth({
    algorithms: ["hmac-sha256"],
    resolveKey: () => {
      const fromEnv = process.env.PARTNER_WEBHOOK_SECRET;
      if (fromEnv && fromEnv.length >= 32) {
        return new TextEncoder().encode(fromEnv);
      }
      return DEMO_PARTNER_HMAC;
    },
  });

  app.post(
    "/webhooks/partner",
    {
      operationId: "partnerWebhook",
      tags: ["webhooks"],
      auth: { scheme: "httpSignature" },
      hooks: partnerAuth,
      request: { body: PartnerEventSchema },
      responses: {
        202: {
          description: "accepted",
          body: z.object({ ok: z.literal(true), eventType: z.string() }),
        },
        401: { description: "invalid or missing signature" },
      },
    },
    async ({ body }) => ({
      status: 202 as const,
      body: { ok: true as const, eventType: body.eventType },
    }),
  );
}

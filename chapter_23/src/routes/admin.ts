/**
 * Admin surface (Ch11): IP allowlist + mTLS client cert at the group level;
 * bearer scopes on the handlers themselves.
 */
import {
  every,
  requireScopes,
  type App,
  type Hooks,
} from "@daloyjs/core";
import { z } from "zod";

export type AdminRouteDeps = {
  verify: Hooks;
};

/**
 * Register admin-only routes on a group App already wrapped with
 * ipRestriction + clientCertAuth.
 */
export function registerAdminRoutes(admin: App, deps: AdminRouteDeps): void {
  const { verify } = deps;

  admin.get(
    "/orders-summary",
    {
      operationId: "adminOrdersSummary",
      tags: ["admin"],
      auth: { scheme: "bearer", scopes: ["orders:read"] },
      hooks: every(verify, requireScopes(["orders:read"])),
      responses: {
        200: {
          description: "ok",
          body: z.object({ ok: z.literal(true), note: z.string() }),
        },
      },
    },
    async () => ({
      status: 200 as const,
      body: {
        ok: true as const,
        note: "Admin summary (IP-restricted + client certificate).",
      },
    }),
  );
}

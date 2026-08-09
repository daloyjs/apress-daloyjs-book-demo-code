/**
 * Post-capstone returns resource (Ch23).
 */
import {
  NotFoundError,
  UnauthorizedError,
  every,
  requireScopes,
  type App,
  type Hooks,
} from "@daloyjs/core";
import { z } from "zod";
import { getOrderForOwner } from "../domain/catalog-orders.ts";
import { ReturnSchema } from "./schemas.ts";

export type ReturnRouteDeps = {
  verify: Hooks;
};

/**
 * Register POST /orders/:id/returns under the same auth posture as order writes.
 */
export function registerReturnRoutes(app: App, deps: ReturnRouteDeps): void {
  const { verify } = deps;

  app.post(
    "/orders/:id/returns",
    {
      operationId: "createReturn",
      tags: ["orders"],
      auth: { scheme: "bearer", scopes: ["orders:write"] },
      hooks: every(verify, requireScopes(["orders:write"])),
      request: {
        params: z.object({ id: z.string().min(1) }).strict(),
        body: z.object({ reason: z.string().min(1) }).strict(),
      },
      responses: {
        201: { description: "created", body: ReturnSchema },
        401: { description: "unauthorized" },
        404: { description: "not found" },
      },
    },
    async ({ params, body, state }) => {
      const user = state.user as { sub?: string } | undefined;
      if (!user?.sub) throw new UnauthorizedError("missing user");
      const order = await getOrderForOwner(params.id, user.sub);
      if (!order) throw new NotFoundError(`Order ${params.id} not found`);
      return {
        status: 201 as const,
        body: {
          id: `ret_${params.id}`,
          orderId: params.id,
          reason: body.reason,
        },
      };
    },
  );
}

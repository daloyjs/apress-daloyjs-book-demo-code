/**
 * Order routes (Ch4 schemas + Ch10 auth + Ch12 webhook sender decoration).
 */
import {
  NotFoundError,
  UnauthorizedError,
  every,
  requireScopes,
  type App,
  type Hooks,
} from "@daloyjs/core";
import type { createWebhookSender } from "@daloyjs/core";
import { z } from "zod";
import { createOrder, getOrderForOwner } from "../domain/catalog-orders.ts";
import { CreateOrderSchema, OrderSchema } from "./schemas.ts";

export type OrderRouteDeps = {
  verify: Hooks;
};

type WebhookSender = ReturnType<typeof createWebhookSender>;

/**
 * Register authenticated order create/read. When `webhookSender` is decorated
 * on the app, createOrder best-effort notifies a demo sink URL (still gated
 * by fetchGuard inside createWebhookSender).
 */
export function registerOrderRoutes(app: App, deps: OrderRouteDeps): void {
  const { verify } = deps;

  app.post(
    "/orders",
    {
      operationId: "createOrder",
      tags: ["orders"],
      auth: { scheme: "bearer", scopes: ["orders:write"] },
      hooks: every(verify, requireScopes(["orders:write"])),
      request: { body: CreateOrderSchema },
      responses: {
        201: { description: "created", body: OrderSchema },
        401: { description: "unauthorized" },
        403: { description: "forbidden" },
      },
    },
    async ({ body, state }) => {
      const user = state.user as { sub?: string } | undefined;
      if (!user?.sub) throw new UnauthorizedError("missing user");
      const order = await createOrder({ ownerId: user.sub, items: body.items });

      // Optional decoration from buildApp (Ch12/22). Failures never fail the order.
      const sender = (state as { webhookSender?: WebhookSender }).webhookSender;
      if (sender && process.env.ORDER_EVENT_WEBHOOK_URL) {
        void sender({
          url: process.env.ORDER_EVENT_WEBHOOK_URL,
          eventType: "order.created",
          payload: { id: order.id, ownerId: order.ownerId },
        }).catch(() => undefined);
      }

      return { status: 201 as const, body: order };
    },
  );

  app.get(
    "/orders/:id",
    {
      operationId: "getOrder",
      tags: ["orders"],
      auth: { scheme: "bearer", scopes: ["orders:read"] },
      hooks: every(verify, requireScopes(["orders:read"])),
      request: { params: z.object({ id: z.string().min(1) }).strict() },
      responses: {
        200: { description: "ok", body: OrderSchema },
        403: { description: "forbidden" },
        404: { description: "not found" },
      },
    },
    async ({ params, state }) => {
      const user = state.user as { sub?: string } | undefined;
      if (!user?.sub) throw new UnauthorizedError("missing user");
      const order = await getOrderForOwner(params.id, user.sub);
      if (!order) throw new NotFoundError(`Order ${params.id} not found`);
      return { status: 200 as const, body: order };
    },
  );
}

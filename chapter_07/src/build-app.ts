import { z } from "zod";
import {
  App,
  NotFoundError,
  rateLimit,
  requestId,
  secureHeaders,
} from "@daloyjs/core";
import type { AppOptions } from "@daloyjs/core";
import {
  createOrder,
  createProduct,
  getOrderForOwner,
  getProduct,
  listProducts,
} from "./domain/catalog-orders.ts";

const ProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    priceCents: z.number().int().nonnegative(),
  })
  .strict();

const CreateProductSchema = z
  .object({
    name: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
  })
  .strict();

const OrderItemSchema = z
  .object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })
  .strict();

const OrderSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    status: z.enum(["pending", "paid", "shipped", "cancelled"]),
    items: z.array(OrderItemSchema),
  })
  .strict();

const CreateOrderSchema = z
  .object({
    items: z.array(OrderItemSchema).min(1),
  })
  .strict();

/**
 * Chapter 4: catalog + orders contracts with .strict() schemas.
 */
export function buildApp(
  overrides: Partial<AppOptions> & { enableTestRoutes?: boolean } = {},
): App {
  const { enableTestRoutes = false, ...appOpts } = overrides;
  const app = new App({
    bodyLimitBytes: 1024 * 1024,
    requestTimeoutMs: 5_000,
    production: process.env.NODE_ENV === "production",
    openapi: { info: { title: "orders-api", version: "0.4.0" } },
    docs: true,
    ...appOpts,
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

  app.get(
    "/products",
    {
      operationId: "listProducts",
      tags: ["catalog"],
      responses: { 200: { description: "ok", body: z.array(ProductSchema) } },
    },
    async () => ({ status: 200 as const, body: await listProducts({ limit: 50 }) }),
  );

  app.get(
    "/products/:id",
    {
      operationId: "getProduct",
      tags: ["catalog"],
      request: { params: z.object({ id: z.string().min(1) }).strict() },
      responses: {
        200: { description: "ok", body: ProductSchema },
        404: { description: "not found" },
      },
    },
    async ({ params }) => {
      const product = await getProduct(params.id);
      if (!product) throw new NotFoundError(`Product ${params.id} not found`);
      return { status: 200 as const, body: product };
    },
  );

  app.post(
    "/products",
    {
      operationId: "createProduct",
      tags: ["catalog"],
      request: { body: CreateProductSchema },
      responses: {
        201: { description: "created", body: ProductSchema },
        400: { description: "validation" },
      },
    },
    async ({ body }) => {
      const product = await createProduct(body);
      return { status: 201 as const, body: product };
    },
  );

  app.post(
    "/orders",
    {
      operationId: "createOrder",
      tags: ["orders"],
      request: { body: CreateOrderSchema },
      responses: {
        201: { description: "created", body: OrderSchema },
        400: { description: "validation" },
      },
    },
    async ({ body }) => {
      const order = await createOrder({ ownerId: "user_alice", items: body.items });
      return { status: 201 as const, body: order };
    },
  );

  app.get(
    "/orders/:id",
    {
      operationId: "getOrder",
      tags: ["orders"],
      request: { params: z.object({ id: z.string().min(1) }).strict() },
      responses: {
        200: { description: "ok", body: OrderSchema },
        404: { description: "not found" },
      },
    },
    async ({ params }) => {
      const order = await getOrderForOwner(params.id, "user_alice");
      if (!order) throw new NotFoundError(`Order ${params.id} not found`);
      return { status: 200 as const, body: order };
    },
  );

  if (enableTestRoutes) {
    app.get(
      "/__test/slow",
      {
        operationId: "testSlow",
        tags: ["test"],
        responses: { 200: { description: "ok", body: z.object({ ok: z.literal(true) }) } },
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

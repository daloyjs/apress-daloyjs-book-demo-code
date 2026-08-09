/**
 * Catalog routes (Ch4 schemas + Ch10 write auth).
 */
import {
  NotFoundError,
  every,
  requireScopes,
  type App,
  type Hooks,
} from "@daloyjs/core";
import { z } from "zod";
import {
  createProduct,
  getProduct,
  listProducts,
} from "../domain/catalog-orders.ts";
import { CreateProductSchema, ProductSchema } from "./schemas.ts";

export type CatalogRouteDeps = {
  verify: Hooks;
};

/**
 * Register public catalog reads and authenticated product creation.
 */
export function registerCatalogRoutes(app: App, deps: CatalogRouteDeps): void {
  const { verify } = deps;

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
      auth: { scheme: "bearer", scopes: ["catalog:write"] },
      hooks: every(verify, requireScopes(["catalog:write"])),
      request: { body: CreateProductSchema },
      responses: {
        201: { description: "created", body: ProductSchema },
        401: { description: "unauthorized" },
        403: { description: "forbidden" },
      },
    },
    async ({ body }) => {
      const product = await createProduct(body);
      return { status: 201 as const, body: product };
    },
  );
}

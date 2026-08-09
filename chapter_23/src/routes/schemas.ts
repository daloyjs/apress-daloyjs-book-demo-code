/**
 * Shared Zod contracts for the progressive orders-api companion (Ch4+).
 * Route modules import these so OpenAPI stays one source of truth.
 */
import { z } from "zod";

export const ProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    priceCents: z.number().int().nonnegative(),
  })
  .strict();

export const CreateProductSchema = z
  .object({
    name: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
  })
  .strict();

export const OrderItemSchema = z
  .object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })
  .strict();

export const OrderSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    status: z.enum(["pending", "paid", "shipped", "cancelled"]),
    items: z.array(OrderItemSchema),
  })
  .strict();

export const CreateOrderSchema = z
  .object({
    items: z.array(OrderItemSchema).min(1),
  })
  .strict();

export const RegisterWebhookSchema = z
  .object({
    url: z.string().min(1),
  })
  .strict();

export const PartnerEventSchema = z
  .object({
    eventType: z.string().min(1),
    orderId: z.string().min(1),
  })
  .strict();

export const ReturnSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    reason: z.string().min(1),
  })
  .strict();

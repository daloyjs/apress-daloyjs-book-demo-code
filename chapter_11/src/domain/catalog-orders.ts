/**
 * In-memory catalog/orders store for the book companion.
 * Pedagogical only. Replace with a real DB in production.
 */

export type Product = {
  id: string;
  name: string;
  priceCents: number;
};

export type OrderItem = { productId: string; quantity: number };

export type Order = {
  id: string;
  ownerId: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  items: OrderItem[];
};

const products = new Map<string, Product>([
  ["sku_mug", { id: "sku_mug", name: "Daloy mug", priceCents: 1800 }],
  ["sku_tee", { id: "sku_tee", name: "Contract-first tee", priceCents: 3200 }],
  ["sku_sticker", { id: "sku_sticker", name: "Strict schema sticker pack", priceCents: 600 }],
]);

const orders = new Map<string, Order>([
  [
    "ord_demo_1",
    {
      id: "ord_demo_1",
      ownerId: "user_alice",
      status: "paid",
      items: [
        { productId: "sku_mug", quantity: 1 },
        { productId: "sku_sticker", quantity: 3 },
      ],
    },
  ],
]);

let orderSeq = 2;

export async function listProducts(opts: { limit?: number } = {}): Promise<Product[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  return [...products.values()].slice(0, limit);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return products.get(id);
}

export async function createProduct(input: {
  name: string;
  priceCents: number;
}): Promise<Product> {
  const id = `sku_${crypto.randomUUID().slice(0, 8)}`;
  const product: Product = { id, name: input.name, priceCents: input.priceCents };
  products.set(id, product);
  return product;
}

export async function getOrderForOwner(
  orderId: string,
  ownerId: string,
): Promise<Order | undefined> {
  const order = orders.get(orderId);
  if (!order || order.ownerId !== ownerId) return undefined;
  return order;
}

export async function createOrder(input: {
  ownerId: string;
  items: OrderItem[];
}): Promise<Order> {
  const id = `ord_${orderSeq++}`;
  const order: Order = {
    id,
    ownerId: input.ownerId,
    status: "pending",
    items: input.items,
  };
  orders.set(id, order);
  return order;
}

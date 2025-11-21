import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or, desc, asc } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/mastra",
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Helper functions for database operations
export async function createOrUpdateUser(telegramData: {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}) {
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.telegramId, telegramData.telegramId),
  });

  if (existingUser) {
    // Update existing user
    const [updated] = await db
      .update(schema.users)
      .set({
        username: telegramData.username,
        firstName: telegramData.firstName,
        lastName: telegramData.lastName,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.telegramId, telegramData.telegramId))
      .returning();
    return updated;
  }

  // Create new user
  const [newUser] = await db
    .insert(schema.users)
    .values({
      telegramId: telegramData.telegramId,
      username: telegramData.username,
      firstName: telegramData.firstName,
      lastName: telegramData.lastName,
    })
    .returning();
  return newUser;
}

export async function getUserByTelegramId(telegramId: string) {
  return await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.telegramId, telegramId),
  });
}

export async function createOrder(data: {
  userId: number;
  serviceType: schema.ServiceType;
  price: number;
  formUrl?: string;
}) {
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: data.userId,
      serviceType: data.serviceType,
      price: data.price,
      formUrl: data.formUrl,
      status: "created",
    })
    .returning();
  return order;
}

export async function updateOrderStatus(
  orderId: number,
  status: schema.OrderStatus
) {
  const [updated] = await db
    .update(schema.orders)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "completed" ? { completedAt: new Date() } : {}),
    })
    .where(eq(schema.orders.id, orderId))
    .returning();
  return updated;
}

export async function getOrderById(orderId: number) {
  return await db.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.id, orderId),
    with: {
      user: true,
      payments: true,
    },
  });
}

export async function getUserOrders(userId: number) {
  return await db.query.orders.findMany({
    where: (orders, { eq }) => eq(orders.userId, userId),
    with: {
      payments: true,
    },
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });
}

export async function createPayment(data: {
  orderId: number;
  amount: number;
  yookassaPaymentId?: string;
  paymentUrl?: string;
}) {
  const [payment] = await db
    .insert(schema.payments)
    .values({
      orderId: data.orderId,
      amount: data.amount,
      yookassaPaymentId: data.yookassaPaymentId,
      paymentUrl: data.paymentUrl,
      status: "pending",
      currency: "RUB",
    })
    .returning();
  return payment;
}

export async function updatePaymentStatus(
  paymentId: number,
  status: schema.PaymentStatus,
  yookassaPaymentId?: string
) {
  const [updated] = await db
    .update(schema.payments)
    .set({
      status,
      yookassaPaymentId,
      updatedAt: new Date(),
      ...(status === "succeeded" ? { paidAt: new Date() } : {}),
    })
    .where(eq(schema.payments.id, paymentId))
    .returning();
  return updated;
}

/**
 * Transactional function: Creates order, payment, and updates status atomically
 * Returns null if any step fails, ensuring no partial data
 */
export async function createOrderWithPaymentTransaction(data: {
  userId: number;
  serviceType: schema.ServiceType;
  price: number;
  formUrl?: string;
  yookassaPaymentId: string;
  paymentUrl: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      // Step 1: Create order with status "created"
      const [order] = await tx
        .insert(schema.orders)
        .values({
          userId: data.userId,
          serviceType: data.serviceType,
          price: data.price,
          formUrl: data.formUrl,
          status: "created",
        })
        .returning();

      // Step 2: Create payment
      const [payment] = await tx
        .insert(schema.payments)
        .values({
          orderId: order.id,
          amount: data.price,
          yookassaPaymentId: data.yookassaPaymentId,
          paymentUrl: data.paymentUrl,
          status: "pending",
          currency: "RUB",
        })
        .returning();

      // Step 3: Update order status to payment_pending
      const [updatedOrder] = await tx
        .update(schema.orders)
        .set({
          status: "payment_pending",
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id))
        .returning();

      return {
        order: updatedOrder,
        payment,
      };
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    return null;
  }
}

export async function getPaymentByYookassaId(yookassaPaymentId: string) {
  return await db.query.payments.findFirst({
    where: (payments, { eq }) =>
      eq(payments.yookassaPaymentId, yookassaPaymentId),
    with: {
      order: {
        with: {
          user: true,
        },
      },
    },
  });
}

export async function getPendingOrders() {
  return await db.query.orders.findMany({
    where: (orders, { or, eq }) =>
      or(
        eq(orders.status, "payment_confirmed"),
        eq(orders.status, "form_filled"),
        eq(orders.status, "processing")
      ),
    with: {
      user: true,
      payments: true,
    },
    orderBy: (orders, { asc }) => [asc(orders.createdAt)],
  });
}

export async function getAdminUsers() {
  return await db.query.users.findMany({
    where: (users, { eq }) => eq(users.isAdmin, true),
  });
}

export async function getPaymentByOrderId(orderId: number) {
  return await db.query.payments.findFirst({
    where: (payments, { eq }) => eq(payments.orderId, orderId),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
  });
}

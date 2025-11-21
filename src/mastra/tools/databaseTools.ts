import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createOrUpdateUser,
  createOrder,
  updateOrderStatus,
  getUserOrders,
  createPayment,
  updatePaymentStatus,
  getOrderById,
  getUserByTelegramId,
  getPendingOrders,
  getPaymentByOrderId,
  createOrderWithPaymentTransaction,
} from "../../../server/storage";
import type { ServiceType, OrderStatus, PaymentStatus } from "../../../shared/schema";

/**
 * Инструмент для создания или обновления пользователя
 */
export const createOrUpdateUserTool = createTool({
  id: "create-or-update-user",
  description:
    "Create a new user or update an existing user's information in the database. Use this when a user interacts with the bot for the first time or their information needs updating.",
  
  inputSchema: z.object({
    telegramId: z.string().describe("User's Telegram ID"),
    username: z.string().optional().describe("User's Telegram username"),
    firstName: z.string().optional().describe("User's first name"),
    lastName: z.string().optional().describe("User's last name"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    userId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("👤 [createOrUpdateUserTool] Creating/updating user", {
      telegramId: context.telegramId,
    });

    try {
      const user = await createOrUpdateUser({
        telegramId: context.telegramId,
        username: context.username,
        firstName: context.firstName,
        lastName: context.lastName,
      });

      logger?.info("✅ [createOrUpdateUserTool] User created/updated", {
        userId: user.id,
      });

      return {
        success: true,
        userId: user.id,
      };
    } catch (error: any) {
      logger?.error("❌ [createOrUpdateUserTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для получения информации о пользователе
 */
export const getUserByTelegramIdTool = createTool({
  id: "get-user-by-telegram-id",
  description:
    "Get user information by Telegram ID. Use this to check if a user exists and retrieve their user ID for creating orders.",
  
  inputSchema: z.object({
    telegramId: z.string().describe("User's Telegram ID"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    userId: z.number().optional(),
    isAdmin: z.boolean().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔍 [getUserByTelegramIdTool] Getting user", {
      telegramId: context.telegramId,
    });

    try {
      const user = await getUserByTelegramId(context.telegramId);

      if (!user) {
        logger?.info("❌ [getUserByTelegramIdTool] User not found");
        return {
          success: false,
          error: "User not found",
        };
      }

      logger?.info("✅ [getUserByTelegramIdTool] User found", {
        userId: user.id,
      });

      return {
        success: true,
        userId: user.id,
        isAdmin: user.isAdmin,
      };
    } catch (error: any) {
      logger?.error("❌ [getUserByTelegramIdTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для создания заказа
 */
export const createOrderTool = createTool({
  id: "create-order",
  description:
    "Create a new order for a user. Use this when a user selects a service to purchase.",
  
  inputSchema: z.object({
    userId: z.number().describe("User's database ID"),
    serviceType: z
      .enum(["financial_detox", "financial_modeling"])
      .describe("Type of service ordered"),
    price: z.number().describe("Price in rubles"),
    formUrl: z.string().optional().describe("URL to the Yandex Form"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    orderId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📝 [createOrderTool] Creating order", {
      userId: context.userId,
      serviceType: context.serviceType,
      price: context.price,
    });

    try {
      // Конвертируем рубли в копейки
      const priceInKopecks = Math.round(context.price * 100);
      
      const order = await createOrder({
        userId: context.userId,
        serviceType: context.serviceType as ServiceType,
        price: priceInKopecks,
        formUrl: context.formUrl,
      });

      logger?.info("✅ [createOrderTool] Order created", {
        orderId: order.id,
      });

      return {
        success: true,
        orderId: order.id,
      };
    } catch (error: any) {
      logger?.error("❌ [createOrderTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для обновления статуса заказа
 */
export const updateOrderStatusTool = createTool({
  id: "update-order-status",
  description:
    "Update the status of an order. Use this to track order progress through different stages.",
  
  inputSchema: z.object({
    orderId: z.number().describe("Order ID to update"),
    status: z
      .enum([
        "created",
        "payment_pending",
        "payment_confirmed",
        "form_sent",
        "form_filled",
        "processing",
        "completed",
        "cancelled",
      ])
      .describe("New status for the order"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔄 [updateOrderStatusTool] Updating order status", {
      orderId: context.orderId,
      status: context.status,
    });

    try {
      await updateOrderStatus(context.orderId, context.status as OrderStatus);

      logger?.info("✅ [updateOrderStatusTool] Order status updated");

      return {
        success: true,
      };
    } catch (error: any) {
      logger?.error("❌ [updateOrderStatusTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для получения заказов пользователя
 */
export const getUserOrdersTool = createTool({
  id: "get-user-orders",
  description:
    "Get all orders for a specific user. Use this to show order history or check user's current orders.",
  
  inputSchema: z.object({
    userId: z.number().describe("User's database ID"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    orders: z
      .array(
        z.object({
          orderId: z.number(),
          serviceType: z.string(),
          status: z.string(),
          price: z.number(),
          createdAt: z.string(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📋 [getUserOrdersTool] Getting user orders", {
      userId: context.userId,
    });

    try {
      const orders = await getUserOrders(context.userId);

      logger?.info("✅ [getUserOrdersTool] Orders retrieved", {
        count: orders.length,
      });

      return {
        success: true,
        orders: orders.map((order) => ({
          orderId: order.id,
          serviceType: order.serviceType,
          status: order.status,
          price: order.price / 100, // Конвертируем копейки в рубли
          createdAt: order.createdAt.toISOString(),
        })),
      };
    } catch (error: any) {
      logger?.error("❌ [getUserOrdersTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для получения заказа по ID
 */
export const getOrderByIdTool = createTool({
  id: "get-order-by-id",
  description:
    "Get order information by order ID. Use this to check order details like service type, status, and form URL.",
  
  inputSchema: z.object({
    orderId: z.number().describe("Order ID to retrieve"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    order: z
      .object({
        orderId: z.number(),
        serviceType: z.string(),
        status: z.string(),
        price: z.number(),
        formUrl: z.string().optional(),
        createdAt: z.string(),
      })
      .optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔍 [getOrderByIdTool] Getting order", {
      orderId: context.orderId,
    });

    try {
      const order = await getOrderById(context.orderId);

      if (!order) {
        logger?.warn("❌ [getOrderByIdTool] Order not found");
        return {
          success: false,
          error: "Order not found",
        };
      }

      logger?.info("✅ [getOrderByIdTool] Order retrieved", {
        orderId: order.id,
        serviceType: order.serviceType,
      });

      return {
        success: true,
        order: {
          orderId: order.id,
          serviceType: order.serviceType,
          status: order.status,
          price: order.price / 100,
          formUrl: order.formUrl || undefined,
          createdAt: order.createdAt.toISOString(),
        },
      };
    } catch (error: any) {
      logger?.error("❌ [getOrderByIdTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для создания платежа
 */
export const createPaymentTool = createTool({
  id: "create-payment",
  description:
    "Create a payment record in the database for an order. Use this after creating a YooKassa payment.",
  
  inputSchema: z.object({
    orderId: z.number().describe("Order ID to create payment for"),
    amount: z.number().describe("Payment amount in rubles"),
    yookassaPaymentId: z.string().optional().describe("YooKassa payment ID"),
    paymentUrl: z.string().optional().describe("Payment URL from YooKassa"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    paymentId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("💰 [createPaymentTool] Creating payment", {
      orderId: context.orderId,
      amount: context.amount,
    });

    try {
      // Конвертируем рубли в копейки
      const amountInKopecks = Math.round(context.amount * 100);
      
      const payment = await createPayment({
        orderId: context.orderId,
        amount: amountInKopecks,
        yookassaPaymentId: context.yookassaPaymentId,
        paymentUrl: context.paymentUrl,
      });

      logger?.info("✅ [createPaymentTool] Payment created", {
        paymentId: payment.id,
      });

      return {
        success: true,
        paymentId: payment.id,
      };
    } catch (error: any) {
      logger?.error("❌ [createPaymentTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для получения заказов, ожидающих обработки (для админа)
 */
export const getPendingOrdersTool = createTool({
  id: "get-pending-orders",
  description:
    "Get all orders that are pending processing (paid but not completed). Use this for admin to see orders that need attention.",
  
  inputSchema: z.object({}),

  outputSchema: z.object({
    success: z.boolean(),
    orders: z
      .array(
        z.object({
          orderId: z.number(),
          userId: z.number(),
          telegramId: z.string(),
          userName: z.string().optional(),
          serviceType: z.string(),
          status: z.string(),
          price: z.number(),
          createdAt: z.string(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📊 [getPendingOrdersTool] Getting pending orders");

    try {
      const orders = await getPendingOrders();

      logger?.info("✅ [getPendingOrdersTool] Orders retrieved", {
        count: orders.length,
      });

      return {
        success: true,
        orders: orders.map((order) => ({
          orderId: order.id,
          userId: order.userId,
          telegramId: order.user.telegramId,
          userName: order.user.username || undefined,
          serviceType: order.serviceType,
          status: order.status,
          price: order.price / 100,
          createdAt: order.createdAt.toISOString(),
        })),
      };
    } catch (error: any) {
      logger?.error("❌ [getPendingOrdersTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * TRANSACTIONAL: Atomically creates order + payment + updates status
 */
export const createOrderWithPaymentTransactionTool = createTool({
  id: "create-order-with-payment-transaction",
  description:
    "Atomically creates an order and payment record with status update in a single transaction. Use this for creating new orders to ensure data consistency.",
  
  inputSchema: z.object({
    userId: z.number().describe("User's database ID"),
    serviceType: z.enum(["financial_detox", "financial_modeling"]).describe("Service type"),
    price: z.number().describe("Price in rubles"),
    formUrl: z.string().optional().describe("Yandex form URL for financial detox"),
    yookassaPaymentId: z.string().describe("YooKassa payment ID"),
    paymentUrl: z.string().describe("YooKassa payment URL"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    orderId: z.number().optional(),
    paymentId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔐 [createOrderWithPaymentTransactionTool] Starting atomic transaction", {
      userId: context.userId,
      serviceType: context.serviceType,
    });

    try {
      const result = await createOrderWithPaymentTransaction({
        userId: context.userId,
        serviceType: context.serviceType as ServiceType,
        price: context.price * 100, // Convert rubles to kopecks
        formUrl: context.formUrl,
        yookassaPaymentId: context.yookassaPaymentId,
        paymentUrl: context.paymentUrl,
      });

      if (!result) {
        logger?.error("❌ [createOrderWithPaymentTransactionTool] Transaction returned null");
        return {
          success: false,
          error: "Transaction failed - all changes rolled back",
        };
      }

      logger?.info("✅ [createOrderWithPaymentTransactionTool] Transaction completed", {
        orderId: result.order.id,
        paymentId: result.payment.id,
      });

      return {
        success: true,
        orderId: result.order.id,
        paymentId: result.payment.id,
      };
    } catch (error: any) {
      logger?.error("❌ [createOrderWithPaymentTransactionTool] Error", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { financialBotAgent } from "../agents/financialBotAgent";
import {
  createOrUpdateUserTool,
  getUserByTelegramIdTool,
  getUserOrdersTool,
  createOrderTool,
  updateOrderStatusTool,
  createPaymentTool,
  getOrderByIdTool,
  createOrderWithPaymentTransactionTool,
  getPendingOrdersTool,
  sendReportTool,
} from "../tools/databaseTools";
import { sendTelegramMessage } from "../tools/telegramTools";
import { createYooKassaPayment, checkYooKassaPayment } from "../tools/yookassaTools";

/**
 * Шаг 1: Создание/обновление пользователя
 */
const ensureUser = createStep({
  id: "ensure-user",
  inputSchema: z.object({
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }),
  outputSchema: z.object({
    dbUserId: z.number(),
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    const result = await createOrUpdateUserTool.execute({
      context: {
        telegramId: String(inputData.userId),
        username: inputData.userName,
        firstName: inputData.firstName,
        lastName: inputData.lastName,
      },
      runtimeContext,
    });
    
    if (!result.success || !result.userId) {
      logger?.error("❌ Failed to create/update user", { error: result.error });
      throw new Error(`Failed to create user: ${result.error || "Unknown error"}`);
    }
    
    return { 
      dbUserId: result.userId,
      ...inputData,
    };
  },
});

/**
 * Шаг 2: Определение действия
 */
const routeAction = createStep({
  id: "route-action",
  inputSchema: z.object({
    dbUserId: z.number(),
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }),
  outputSchema: z.object({
    action: z.enum(["create_order_detox", "create_order_modeling", "confirm_payment", "show_admin_panel", "send_report", "use_agent"]),
    orderId: z.number().optional(),
    paymentId: z.string().optional(),
    dbUserId: z.number(),
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const logger = mastra?.getLogger();
    let action: "create_order_detox" | "create_order_modeling" | "confirm_payment" | "show_admin_panel" | "send_report" | "use_agent" = "use_agent";
    let orderId: number | undefined;
    let paymentId: string | undefined;

    logger?.info("🔀 [routeAction] Determining action", {
      messageType: inputData.messageType,
      callbackData: inputData.callbackData,
      message: inputData.message,
    });

    // Проверяем является ли пользователь админом
    const userResult = await getUserByTelegramIdTool.execute({
      context: { telegramId: String(inputData.userId) },
      runtimeContext,
    });
    const isAdmin = userResult.isAdmin === true;

    // Admin commands
    if (isAdmin) {
      if (inputData.messageType === "message" && inputData.message === "/admin") {
        action = "show_admin_panel";
      } else if (inputData.messageType === "callback_query" && inputData.callbackData) {
        const data = inputData.callbackData;
        if (data.startsWith("send_report_")) {
          // Формат: send_report_<orderId>
          const match = data.match(/^send_report_(\d+)$/);
          if (match && match[1]) {
            const parsedOrderId = parseInt(match[1]);
            if (!isNaN(parsedOrderId)) {
              action = "send_report";
              orderId = parsedOrderId;
            }
          }
        }
      }
    }

    // Regular user commands
    if (action === "use_agent" && inputData.messageType === "callback_query" && inputData.callbackData) {
      const data = inputData.callbackData;
      if (data === "order_detox") {
        action = "create_order_detox";
      } else if (data === "order_modeling") {
        action = "create_order_modeling";
      } else if (data.startsWith("payment_")) {
        // Формат: payment_<orderId>_<paymentId>
        // Payment ID может содержать подчёркивания, поэтому берем все части после первого underscore после orderId
        const match = data.match(/^payment_(\d+)_(.+)$/);
        if (match && match[1] && match[2]) {
          const parsedOrderId = parseInt(match[1]);
          if (!isNaN(parsedOrderId)) {
            action = "confirm_payment";
            orderId = parsedOrderId;
            paymentId = match[2];
          }
        }
      }
    }

    logger?.info("✅ [routeAction] Action determined", {
      action,
      orderId,
      paymentId,
    });

    return {
      action,
      orderId,
      paymentId,
      ...inputData,
    };
  },
});

/**
 * Шаг 3: Создание заказа для детокса
 */
const createDetoxOrder = createStep({
  id: "create-detox-order",
  inputSchema: z.object({
    dbUserId: z.number(),
    chatId: z.number(),
    userId: z.number(),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📦 Creating detox order");

    // TRANSACTIONAL APPROACH: Сначала YooKassa, затем atomic DB transaction
    logger?.info("🔐 Creating YooKassa payment first");
    
    const yookassaResult = await createYooKassaPayment.execute({
      context: {
        amount: 450,
        description: "Оплата: Финансовый детокс",
      },
      runtimeContext,
      mastra,
    });

    logger?.info("📊 YooKassa result received", {
      success: yookassaResult.success,
      paymentId: yookassaResult.paymentId,
      paymentUrl: yookassaResult.paymentUrl,
      error: yookassaResult.error,
    });

    if (!yookassaResult.success || !yookassaResult.paymentId || !yookassaResult.paymentUrl) {
      logger?.error("❌ YooKassa payment creation failed", {
        error: yookassaResult.error,
      });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Не удалось создать платёж. Попробуйте позже.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    logger?.info("✅ YooKassa payment created", { paymentId: yookassaResult.paymentId });

    // ATOMIC DB TRANSACTION: order + payment + status update
    logger?.info("🔐 Starting atomic DB transaction");
    
    const transactionResult = await createOrderWithPaymentTransactionTool.execute({
      context: {
        userId: inputData.dbUserId,
        serviceType: "financial_detox",
        price: 450,
        formUrl: "https://forms.yandex.ru/u/6912423849af471482e765d3",
        yookassaPaymentId: yookassaResult.paymentId,
        paymentUrl: yookassaResult.paymentUrl,
      },
      runtimeContext,
    });

    if (!transactionResult.success || !transactionResult.orderId || !transactionResult.paymentId) {
      logger?.error("❌ CRITICAL: DB transaction failed - no partial data created");
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Не удалось создать заказ. Попробуйте позже.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    logger?.info("✅ Transaction completed successfully", {
      orderId: transactionResult.orderId,
      paymentId: transactionResult.paymentId,
    });

    // Отправляем сообщение
    await sendTelegramMessage.execute({
      context: {
        chatId: inputData.chatId,
        text: `💳 Заказ №${transactionResult.orderId} создан!\n\nУслуга: Финансовый детокс\nСумма: 450₽\n\n👉 Оплатите:\n${yookassaResult.paymentUrl}`,
        inlineKeyboard: [[{
          text: "✅ Я оплатил",
          callback_data: `payment_${transactionResult.orderId}_${yookassaResult.paymentId}`,
        }]],
        parseMode: "Markdown",
      },
      runtimeContext,
    });

    return { success: true };
  },
});

/**
 * Шаг 4: Создание заказа для моделирования
 */
const createModelingOrder = createStep({
  id: "create-modeling-order",
  inputSchema: z.object({
    dbUserId: z.number(),
    chatId: z.number(),
    userId: z.number(),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📦 Creating modeling order");

    // TRANSACTIONAL APPROACH: Сначала YooKassa, затем atomic DB transaction
    logger?.info("🔐 Creating YooKassa payment first");
    
    const yookassaResult = await createYooKassaPayment.execute({
      context: {
        amount: 350,
        description: "Оплата: Финансовое моделирование",
      },
      runtimeContext,
      mastra,
    });

    logger?.info("📊 YooKassa result received", {
      success: yookassaResult.success,
      paymentId: yookassaResult.paymentId,
      paymentUrl: yookassaResult.paymentUrl,
      error: yookassaResult.error,
    });

    if (!yookassaResult.success || !yookassaResult.paymentId || !yookassaResult.paymentUrl) {
      logger?.error("❌ YooKassa payment creation failed");
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Не удалось создать платёж. Попробуйте позже.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    logger?.info("✅ YooKassa payment created", { paymentId: yookassaResult.paymentId });

    // ATOMIC DB TRANSACTION: order + payment + status update
    logger?.info("🔐 Starting atomic DB transaction");
    
    const transactionResult = await createOrderWithPaymentTransactionTool.execute({
      context: {
        userId: inputData.dbUserId,
        serviceType: "financial_modeling",
        price: 350,
        formUrl: undefined,
        yookassaPaymentId: yookassaResult.paymentId,
        paymentUrl: yookassaResult.paymentUrl,
      },
      runtimeContext,
    });

    if (!transactionResult.success || !transactionResult.orderId || !transactionResult.paymentId) {
      logger?.error("❌ CRITICAL: DB transaction failed - no partial data created");
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Не удалось создать заказ. Попробуйте позже.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    logger?.info("✅ Transaction completed successfully", {
      orderId: transactionResult.orderId,
      paymentId: transactionResult.paymentId,
    });

    await sendTelegramMessage.execute({
      context: {
        chatId: inputData.chatId,
        text: `💳 Заказ №${transactionResult.orderId} создан!\n\nУслуга: Финансовое моделирование\nСумма: 350₽\n\n👉 Оплатите:\n${yookassaResult.paymentUrl}`,
        inlineKeyboard: [[{
          text: "✅ Я оплатил",
          callback_data: `payment_${transactionResult.orderId}_${yookassaResult.paymentId}`,
        }]],
        parseMode: "Markdown",
      },
      runtimeContext,
    });

    return { success: true };
  },
});

/**
 * Шаг 5: Подтверждение оплаты
 */
const confirmPayment = createStep({
  id: "confirm-payment",
  inputSchema: z.object({
    orderId: z.number(),
    paymentId: z.string(),
    chatId: z.number(),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("💰 Confirming payment", { orderId: inputData.orderId, paymentId: inputData.paymentId });

    // Проверяем что заказ существует
    const orderResult = await getOrderByIdTool.execute({
      context: { orderId: inputData.orderId },
      runtimeContext,
    });

    if (!orderResult.order) {
      logger?.warn("❌ Order not found", { orderId: inputData.orderId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Заказ не найден.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    // Получаем payment record для заказа
    const { getPaymentByOrderId, updatePaymentStatus: dbUpdatePaymentStatus } = await import("../../../server/storage");
    const payment = await getPaymentByOrderId(inputData.orderId);

    if (!payment || !payment.yookassaPaymentId) {
      logger?.warn("❌ Payment not found for order", { orderId: inputData.orderId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Платёж для заказа не найден.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    // Проверяем что paymentId из callback совпадает с сохранённым
    if (payment.yookassaPaymentId !== inputData.paymentId) {
      logger?.warn("❌ Payment ID mismatch", { 
        expected: payment.yookassaPaymentId, 
        received: inputData.paymentId 
      });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Неверный платёж для этого заказа.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    // Проверяем что платёж еще не был подтверждён (защита от replay)
    if (payment.status === "succeeded") {
      logger?.warn("⚠️ Payment already confirmed", { paymentId: payment.yookassaPaymentId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "✅ Этот платёж уже был подтверждён ранее.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    // Проверяем статус платежа в YooKassa
    const paymentStatus = await checkYooKassaPayment.execute({
      context: { paymentId: inputData.paymentId },
      runtimeContext,
      mastra,
    });

    if (!paymentStatus.paid) {
      logger?.info("⏳ Payment not yet confirmed", { paymentId: inputData.paymentId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Оплата ещё не подтверждена.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    logger?.info("✅ Payment confirmed by YooKassa", { orderId: inputData.orderId });

    // КРИТИЧНО: Сначала обновляем order status, ЗАТЕМ payment status
    // Это предотвращает inconsistent state где payment = succeeded но order = payment_pending

    // Шаг 1: Обновляем статус заказа на payment_confirmed
    const statusUpdateResult = await updateOrderStatusTool.execute({
      context: {
        orderId: inputData.orderId,
        status: "payment_confirmed",
      },
      runtimeContext,
    });

    if (!statusUpdateResult.success) {
      logger?.error("❌ Failed to update order status to payment_confirmed", { orderId: inputData.orderId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "⚠️ Оплата подтверждена, но произошла техническая ошибка. Свяжитесь с поддержкой.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    // Шаг 2: Обновляем статус платежа в БД (КРИТИЧНО для защиты от replay)
    // Делаем это ПОСЛЕ успешного обновления order status
    // ВАЖНО: Если это fails, мы ДОЛЖНЫ вернуть error чтобы предотвратить replay attacks
    try {
      const paymentUpdateResult = await dbUpdatePaymentStatus(payment.id, "succeeded");
      if (!paymentUpdateResult) {
        throw new Error("Payment status update returned null");
      }
      logger?.info("✅ Payment status updated in DB");
    } catch (error: any) {
      logger?.error("❌ CRITICAL: Failed to update payment status in DB", { error: error.message });
      
      // КРИТИЧНО: Попытка rollback order status обратно в payment_pending
      let rollbackSucceeded = false;
      try {
        const rollbackResult = await updateOrderStatusTool.execute({
          context: {
            orderId: inputData.orderId,
            status: "payment_pending",
          },
          runtimeContext,
        });
        
        if (rollbackResult.success) {
          logger?.info("✅ Order status rolled back to payment_pending");
          rollbackSucceeded = true;
        } else {
          logger?.error("❌ CRITICAL: Rollback returned success=false - order may be stuck at payment_confirmed");
        }
      } catch (rollbackError: any) {
        logger?.error("❌ CRITICAL: Rollback threw exception", { error: rollbackError.message });
      }

      // Уведомляем пользователя и оператора
      const userMessage = rollbackSucceeded
        ? "❌ Не удалось обработать платёж. Попробуйте оплатить снова или свяжитесь с поддержкой."
        : "❌ Произошла критическая ошибка. СРОЧНО свяжитесь с поддержкой (код: PAYMENT_STUCK).";
      
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: userMessage,
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      
      if (!rollbackSucceeded) {
        logger?.error("❌ CRITICAL OPERATOR ALERT: Order stuck at payment_confirmed while payment is pending", {
          orderId: inputData.orderId,
          paymentId: payment.id,
        });
      }
      
      return { success: false };
    }

    // Обрабатываем по типу услуги
    if (orderResult.order.serviceType === "financial_detox") {
      const formSentResult = await updateOrderStatusTool.execute({
        context: {
          orderId: inputData.orderId,
          status: "form_sent",
        },
        runtimeContext,
      });

      if (!formSentResult.success) {
        logger?.error("❌ Failed to update order status to form_sent", { orderId: inputData.orderId });
        // Заказ остался в payment_confirmed, но пользователь должен знать
        await sendTelegramMessage.execute({
          context: {
            chatId: inputData.chatId,
            text: "⚠️ Оплата получена, но произошла ошибка при отправке формы. Свяжитесь с поддержкой.",
            inlineKeyboard: undefined,
            parseMode: "Markdown",
          },
          runtimeContext,
        });
        return { success: false };
      }

      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: `✅ Оплата получена!\n\n📝 Заполните опрос:\n${orderResult.order.formUrl}\n\nПосле заполнения исполнитель подготовит отчет.`,
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
    } else {
      const completedResult = await updateOrderStatusTool.execute({
        context: {
          orderId: inputData.orderId,
          status: "completed",
        },
        runtimeContext,
      });

      if (!completedResult.success) {
        logger?.error("❌ Failed to update order status to completed", { orderId: inputData.orderId });
        await sendTelegramMessage.execute({
          context: {
            chatId: inputData.chatId,
            text: "⚠️ Оплата получена, но произошла ошибка. Свяжитесь с поддержкой.",
            inlineKeyboard: undefined,
            parseMode: "Markdown",
          },
          runtimeContext,
        });
        return { success: false };
      }

      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "✅ Оплата получена! Доступ к алгоритму открыт.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
    }

    logger?.info("✅ Payment confirmation completed successfully");
    return { success: true };
  },
});

/**
 * Шаг 6: Админ-панель - показ всех заявок
 */
const showAdminPanel = createStep({
  id: "show-admin-panel",
  inputSchema: z.object({
    chatId: z.number(),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("👨‍💼 [showAdminPanel] Showing admin panel");

    // Получаем все pending orders
    const ordersResult = await getPendingOrdersTool.execute({
      context: {},
      runtimeContext,
      mastra,
    });

    if (!ordersResult.success || !ordersResult.orders) {
      logger?.error("❌ Failed to get pending orders");
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Не удалось получить список заявок.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    if (ordersResult.orders.length === 0) {
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "📋 Нет заявок, требующих обработки.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: true };
    }

    // Формируем сообщение со списком заявок
    const ordersList = ordersResult.orders.map(order => {
      const service = order.serviceType === "financial_detox" ? "💰 Детокс" : "📊 Моделирование";
      const userName = order.userName || order.telegramId;
      return `#${order.orderId} • ${service} • ${order.price}₽\n👤 @${userName}\n📅 ${new Date(order.createdAt).toLocaleString("ru-RU")}`;
    }).join("\n\n");

    // Формируем кнопки для отправки отчетов
    const buttons = ordersResult.orders.map(order => [{
      text: `📤 Отправить отчет #${order.orderId}`,
      callback_data: `send_report_${order.orderId}`,
    }]);

    await sendTelegramMessage.execute({
      context: {
        chatId: inputData.chatId,
        text: `👨‍💼 *АДМИН-ПАНЕЛЬ*\n\nЗаявки на обработку (${ordersResult.orders.length}):\n\n${ordersList}`,
        inlineKeyboard: buttons,
        parseMode: "Markdown",
      },
      runtimeContext,
    });

    return { success: true };
  },
});

/**
 * Шаг 7: Отправка отчета пользователю
 */
const sendReport = createStep({
  id: "send-report",
  inputSchema: z.object({
    orderId: z.number(),
    chatId: z.number(),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, runtimeContext, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📤 [sendReport] Sending report", { orderId: inputData.orderId });

    // Получаем информацию о заказе
    const orderResult = await getOrderByIdTool.execute({
      context: { orderId: inputData.orderId },
      runtimeContext,
    });

    if (!orderResult.order) {
      logger?.error("❌ Order not found", { orderId: inputData.orderId });
      await sendTelegramMessage.execute({
        context: {
          chatId: inputData.chatId,
          text: "❌ Заказ не найден.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return { success: false };
    }

    await sendTelegramMessage.execute({
      context: {
        chatId: inputData.chatId,
        text: `📤 Для отправки отчета пользователю:\n\n1. Загрузите PDF и/или Excel файлы отчета\n2. В подписи к файлу укажите: \`/send ${orderResult.order.userId}\`\n\nЗаказ #${inputData.orderId}\nПользователь ID: ${orderResult.order.userId}\nТип: ${orderResult.order.serviceType}\n\n_Отправьте файлы с подписью в этот чат_`,
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });

    return { success: true };
  },
});

/**
 * Шаг 8: Fallback к агенту
 */
const useAgent = createStep({
  id: "use-agent",
  inputSchema: z.object({
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    message: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }).passthrough(),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    const prompt = inputData.messageType === "message"
      ? `Пользователь написал: "${inputData.message}"\n\nKONTEXT: chatId=${inputData.chatId}, userId=${inputData.userId}, userName=${inputData.userName || ''}, firstName=${inputData.firstName || ''}, lastName=${inputData.lastName || ''}`
      : `Пользователь нажал: ${inputData.callbackData}\n\nKONTEXT: chatId=${inputData.chatId}, userId=${inputData.userId}`;

    logger?.info("🤖 [useAgent] Starting agent generation", {
      threadId: inputData.threadId,
      chatId: inputData.chatId,
      prompt,
    });

    try {
      const response = await financialBotAgent.generateLegacy(
        [{ role: "user", content: prompt }],
        {
          resourceId: "telegram-bot",
          threadId: inputData.threadId,
          maxSteps: 3, // Ограничиваем для скорости (3-5 секунд)
        }
      );

      logger?.info("✅ [useAgent] Agent completed", {
        responseLength: response?.text?.length || 0,
      });

      return { success: true };
    } catch (error: any) {
      logger?.error("❌ [useAgent] Agent failed", {
        error: error.message,
        stack: error.stack,
      });
      return { success: false };
    }
  },
});

/**
 * Главный workflow
 */
export const telegramBotWorkflow = createWorkflow({
  id: "telegram-bot-workflow",
  inputSchema: z.object({
    threadId: z.string(),
    chatId: z.number(),
    userId: z.number(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }) as any,
  outputSchema: z.object({ success: z.boolean() }),
})
  .then(ensureUser as any)
  .then(routeAction as any)
  .branch([
    [async ({ inputData }) => inputData.action === "create_order_detox", createDetoxOrder as any],
    [async ({ inputData }) => inputData.action === "create_order_modeling", createModelingOrder as any],
    [async ({ inputData }) => inputData.action === "confirm_payment", confirmPayment as any],
    [async ({ inputData }) => inputData.action === "show_admin_panel", showAdminPanel as any],
    [async ({ inputData }) => inputData.action === "send_report", sendReport as any],
    [async ({ inputData }) => inputData.action === "use_agent", useAgent as any],
  ] as any)
  .commit();

import { Mastra } from "@mastra/core";
import { financialBotAgent } from "./agents/financialBotAgent";
import { sendTelegramMessage } from "./tools/telegramTools";
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
} from "./tools/databaseTools";
import { createYooKassaPayment, checkYooKassaPayment } from "./tools/yookassaTools";

export interface TelegramMessageData {
  threadId: string;
  chatId: number;
  userId: number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  message?: string;
  messageId?: number;
  callbackQueryId?: string;
  callbackData?: string;
  messageType: "message" | "callback_query" | "document";
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
}

export async function handleTelegramMessageDirect(
  mastra: Mastra,
  data: TelegramMessageData,
  runtimeContext: any
): Promise<void> {
  const logger = mastra.getLogger();
  
  try {
    logger?.info("🚀 [ProductionHandler] Processing message directly", {
      chatId: data.chatId,
      userId: data.userId,
      messageType: data.messageType,
    });

    // Check if database is available
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    let dbUserId: number | undefined;
    let isAdmin = false;

    if (hasDatabaseUrl) {
      // Step 1: Ensure user exists (only if database is available)
      try {
        const createResult = await createOrUpdateUserTool.execute({
          context: {
            telegramId: String(data.userId),
            username: data.userName,
            firstName: data.firstName,
            lastName: data.lastName,
          },
          runtimeContext,
        });

        if (createResult.success && createResult.userId) {
          dbUserId = createResult.userId;
        }

        // Get admin status
        const userResult = await getUserByTelegramIdTool.execute({
          context: { telegramId: String(data.userId) },
          runtimeContext,
        });
        isAdmin = userResult.isAdmin === true;
      } catch (dbError: any) {
        logger?.warn("⚠️ [ProductionHandler] Database operation failed, continuing without DB", {
          error: dbError.message,
        });
      }
    } else {
      logger?.info("ℹ️ [ProductionHandler] No DATABASE_URL, running without database features");
      // Check admin by telegram ID directly (hardcoded fallback)
      isAdmin = data.userId === 1071532376;
    }

    logger?.info("👤 [ProductionHandler] User info", { dbUserId, isAdmin });

    // Step 2: Route action
    let action = "use_agent";
    let orderId: number | undefined;
    let paymentId: string | undefined;

    // Admin commands
    if (isAdmin && data.messageType === "message" && data.message === "/admin") {
      action = "show_admin_panel";
    }

    // Callback queries
    if (data.messageType === "callback_query" && data.callbackData) {
      const callbackData = data.callbackData;
      
      if (callbackData === "order_detox") {
        action = "create_order_detox";
      } else if (callbackData === "order_modeling") {
        action = "create_order_modeling";
      } else if (callbackData.startsWith("payment_")) {
        const match = callbackData.match(/^payment_(\d+)_(.+)$/);
        if (match && match[1] && match[2]) {
          action = "confirm_payment";
          orderId = parseInt(match[1]);
          paymentId = match[2];
        }
      } else if (callbackData.startsWith("send_report_")) {
        const reportOrderId = parseInt(callbackData.replace("send_report_", ""));
        if (!isNaN(reportOrderId) && isAdmin) {
          action = "send_report";
          orderId = reportOrderId;
        }
      }
    }

    logger?.info("🔀 [ProductionHandler] Action determined", { action, orderId, paymentId, hasDatabaseUrl });

    // Step 3: Execute action
    // Actions that require database: create_order_*, confirm_payment, show_admin_panel, send_report
    const dbRequiredActions = ["create_order_detox", "create_order_modeling", "confirm_payment", "show_admin_panel", "send_report"];
    
    if (dbRequiredActions.includes(action) && (!hasDatabaseUrl || !dbUserId)) {
      logger?.warn("⚠️ [ProductionHandler] Database required but not available for action", { action });
      await sendTelegramMessage.execute({
        context: {
          chatId: data.chatId,
          text: "⚠️ Эта функция временно недоступна. Пожалуйста, обратитесь в поддержку.",
          inlineKeyboard: undefined,
          parseMode: "Markdown",
        },
        runtimeContext,
      });
      return;
    }

    switch (action) {
      case "create_order_detox":
        await handleCreateDetoxOrder(data, dbUserId!, runtimeContext, logger);
        break;

      case "create_order_modeling":
        await handleCreateModelingOrder(data, dbUserId!, runtimeContext, logger);
        break;

      case "confirm_payment":
        if (orderId && paymentId) {
          await handleConfirmPayment(data, orderId, paymentId, runtimeContext, mastra, logger);
        }
        break;

      case "show_admin_panel":
        await handleShowAdminPanel(data, runtimeContext, logger);
        break;

      case "send_report":
        if (orderId) {
          await handleSendReport(data, orderId, runtimeContext, logger);
        }
        break;

      default:
        await handleUseAgent(data, mastra, runtimeContext, logger);
        break;
    }

    logger?.info("✅ [ProductionHandler] Message processed successfully");
  } catch (error: any) {
    logger?.error("❌ [ProductionHandler] Error processing message", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function handleCreateDetoxOrder(
  data: TelegramMessageData,
  dbUserId: number,
  runtimeContext: any,
  logger: any
): Promise<void> {
  logger?.info("📦 [ProductionHandler] Creating detox order");

  const yookassaResult = await createYooKassaPayment.execute({
    context: {
      amount: 450,
      description: "Оплата: Финансовый детокс",
    },
    runtimeContext,
  });

  if (!yookassaResult.success || !yookassaResult.paymentId || !yookassaResult.paymentUrl) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Не удалось создать платёж. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  const transactionResult = await createOrderWithPaymentTransactionTool.execute({
    context: {
      userId: dbUserId,
      serviceType: "financial_detox",
      price: 450,
      formUrl: "https://forms.yandex.ru/u/6912423849af471482e765d3",
      yookassaPaymentId: yookassaResult.paymentId,
      paymentUrl: yookassaResult.paymentUrl,
    },
    runtimeContext,
  });

  if (!transactionResult.success || !transactionResult.orderId) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Не удалось создать заказ. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  await sendTelegramMessage.execute({
    context: {
      chatId: data.chatId,
      text: `💳 Заказ №${transactionResult.orderId} создан!\n\nУслуга: Финансовый детокс\nСумма: 450₽\n\n👉 Оплатите:\n${yookassaResult.paymentUrl}`,
      inlineKeyboard: [[{
        text: "✅ Я оплатил",
        callback_data: `payment_${transactionResult.orderId}_${yookassaResult.paymentId}`,
      }]],
      parseMode: "Markdown",
    },
    runtimeContext,
  });
}

async function handleCreateModelingOrder(
  data: TelegramMessageData,
  dbUserId: number,
  runtimeContext: any,
  logger: any
): Promise<void> {
  logger?.info("📦 [ProductionHandler] Creating modeling order");

  const yookassaResult = await createYooKassaPayment.execute({
    context: {
      amount: 350,
      description: "Оплата: Финансовое моделирование",
    },
    runtimeContext,
  });

  if (!yookassaResult.success || !yookassaResult.paymentId || !yookassaResult.paymentUrl) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Не удалось создать платёж. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  const transactionResult = await createOrderWithPaymentTransactionTool.execute({
    context: {
      userId: dbUserId,
      serviceType: "financial_modeling",
      price: 350,
      formUrl: undefined,
      yookassaPaymentId: yookassaResult.paymentId,
      paymentUrl: yookassaResult.paymentUrl,
    },
    runtimeContext,
  });

  if (!transactionResult.success || !transactionResult.orderId) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Не удалось создать заказ. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  await sendTelegramMessage.execute({
    context: {
      chatId: data.chatId,
      text: `💳 Заказ №${transactionResult.orderId} создан!\n\nУслуга: Финансовое моделирование\nСумма: 350₽\n\n👉 Оплатите:\n${yookassaResult.paymentUrl}`,
      inlineKeyboard: [[{
        text: "✅ Я оплатил",
        callback_data: `payment_${transactionResult.orderId}_${yookassaResult.paymentId}`,
      }]],
      parseMode: "Markdown",
    },
    runtimeContext,
  });
}

async function handleConfirmPayment(
  data: TelegramMessageData,
  orderId: number,
  paymentId: string,
  runtimeContext: any,
  mastra: Mastra,
  logger: any
): Promise<void> {
  logger?.info("💰 [ProductionHandler] Confirming payment", { orderId, paymentId });

  const orderResult = await getOrderByIdTool.execute({
    context: { orderId },
    runtimeContext,
  });

  if (!orderResult.order) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Заказ не найден.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  // Check payment with YooKassa
  const paymentStatus = await checkYooKassaPayment.execute({
    context: { paymentId },
    runtimeContext,
    mastra,
  });

  if (!paymentStatus.paid) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Оплата ещё не подтверждена. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  // Update order status
  await updateOrderStatusTool.execute({
    context: {
      orderId,
      status: "payment_confirmed",
    },
    runtimeContext,
  });

  // Handle by service type
  if (orderResult.order.serviceType === "financial_detox") {
    await updateOrderStatusTool.execute({
      context: { orderId, status: "form_sent" },
      runtimeContext,
    });

    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: `✅ Оплата подтверждена!\n\n📝 Заполните анкету:\n${orderResult.order.formUrl || "https://forms.yandex.ru/u/6912423849af471482e765d3"}`,
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
  } else if (orderResult.order.serviceType === "financial_modeling") {
    await updateOrderStatusTool.execute({
      context: { orderId, status: "processing" },
      runtimeContext,
    });

    const hostUrl = process.env.HOST_URL || "";
    const miniAppUrl = `${hostUrl}/financial-modeling.html?user_id=${data.userId}&order_id=${orderId}`;

    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: `✅ Оплата подтверждена!\n\n📊 Откройте приложение для финансового моделирования:`,
        inlineKeyboard: [[{
          text: "📊 Открыть калькулятор",
          web_app: { url: miniAppUrl },
        }]],
        parseMode: "Markdown",
      },
      runtimeContext,
    });
  }
}

async function handleShowAdminPanel(
  data: TelegramMessageData,
  runtimeContext: any,
  logger: any
): Promise<void> {
  logger?.info("👨‍💼 [ProductionHandler] Showing admin panel");

  const pendingResult = await getPendingOrdersTool.execute({
    context: {},
    runtimeContext,
  });

  if (!pendingResult.success || !pendingResult.orders?.length) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "📭 Нет заказов для обработки.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
    return;
  }

  const buttons = pendingResult.orders.map((order: any) => [{
    text: `📤 Заказ #${order.id} - ${order.serviceType}`,
    callback_data: `send_report_${order.id}`,
  }]);

  await sendTelegramMessage.execute({
    context: {
      chatId: data.chatId,
      text: `📋 *Панель администратора*\n\nЗаказы, ожидающие отправки отчёта:`,
      inlineKeyboard: buttons,
      parseMode: "Markdown",
    },
    runtimeContext,
  });
}

async function handleSendReport(
  data: TelegramMessageData,
  orderId: number,
  runtimeContext: any,
  logger: any
): Promise<void> {
  logger?.info("📤 [ProductionHandler] Sending report", { orderId });

  const result = await sendReportTool.execute({
    context: { orderId },
    runtimeContext,
  });

  if (result.success) {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: `✅ Отчёт для заказа #${orderId} отправлен клиенту.`,
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
  } else {
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: `❌ Ошибка отправки: ${result.error}`,
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
  }
}

async function handleUseAgent(
  data: TelegramMessageData,
  mastra: Mastra,
  runtimeContext: any,
  logger: any
): Promise<void> {
  logger?.info("🤖 [ProductionHandler] Using agent");

  const agent = mastra.getAgent("financialBotAgent");
  if (!agent) {
    logger?.error("❌ [ProductionHandler] Agent not found");
    return;
  }

  const prompt = data.callbackData
    ? `Пользователь нажал кнопку: "${data.callbackData}"\n\nKONTEXT: chatId=${data.chatId}, userId=${data.userId}, userName=${data.userName}, firstName=${data.firstName}, lastName=${data.lastName}`
    : `Пользователь написал: "${data.message}"\n\nKONTEXT: chatId=${data.chatId}, userId=${data.userId}, userName=${data.userName}, firstName=${data.firstName}, lastName=${data.lastName}`;

  try {
    const response = await agent.generate(prompt, {
      threadId: data.threadId,
      resourceId: `telegram-${data.userId}`,
    });

    logger?.info("✅ [ProductionHandler] Agent response received", {
      responseLength: response.text?.length,
    });
  } catch (error: any) {
    logger?.error("❌ [ProductionHandler] Agent error", { error: error.message });
    
    await sendTelegramMessage.execute({
      context: {
        chatId: data.chatId,
        text: "❌ Произошла ошибка. Попробуйте позже.",
        inlineKeyboard: undefined,
        parseMode: "Markdown",
      },
      runtimeContext,
    });
  }
}

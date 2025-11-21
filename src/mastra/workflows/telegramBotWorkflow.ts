import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { financialBotAgent } from "../agents/financialBotAgent";

/**
 * Шаг: Обработка входящего сообщения или callback query через агента
 */
const processMessageWithAgent = createStep({
  id: "process-message-with-agent",
  description:
    "Processes incoming Telegram messages and callback queries using the Financial Bot Agent with AI-powered conversation handling",

  inputSchema: z.object({
    threadId: z.string().describe("Unique thread ID for conversation tracking"),
    chatId: z.number().describe("Telegram chat ID"),
    userId: z.number().describe("Telegram user ID"),
    userName: z.string().optional().describe("Telegram username"),
    firstName: z.string().optional().describe("User's first name"),
    lastName: z.string().optional().describe("User's last name"),
    message: z.string().optional().describe("User's text message"),
    messageId: z.number().optional().describe("Telegram message ID"),
    callbackQueryId: z.string().optional().describe("Callback query ID for button clicks"),
    callbackData: z.string().optional().describe("Data from button click"),
    messageType: z
      .enum(["message", "callback_query"])
      .describe("Type of incoming update"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    response: z.string(),
    error: z.string().optional(),
  }),

  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🤖 [processMessageWithAgent] Processing with AI agent", {
      threadId: inputData.threadId,
      chatId: inputData.chatId,
      messageType: inputData.messageType,
    });

    try {
      // Формируем контекст для агента
      let userPrompt = "";
      
      if (inputData.messageType === "message") {
        // Обычное сообщение
        userPrompt = `
Пользователь отправил сообщение:
- Chat ID: ${inputData.chatId}
- User ID (Telegram): ${inputData.userId}
- Username: ${inputData.userName || "не указан"}
- Имя: ${inputData.firstName || ""}
- Фамилия: ${inputData.lastName || ""}
- Сообщение: "${inputData.message}"

Обработай это сообщение и выполни необходимые действия.
Если это команда /start, покажи главное меню.
`;
      } else if (inputData.messageType === "callback_query") {
        // Нажатие на кнопку
        userPrompt = `
Пользователь нажал кнопку:
- Chat ID: ${inputData.chatId}
- User ID (Telegram): ${inputData.userId}
- Username: ${inputData.userName || "не указан"}
- Callback Query ID: ${inputData.callbackQueryId}
- Callback Data: ${inputData.callbackData}
- Message ID: ${inputData.messageId}

ВАЖНО: Callback query уже автоматически подтверждён системой, тебе НЕ нужно его подтверждать.
Обработай это нажатие кнопки, выполни нужные действия и обнови интерфейс.
`;
      }

      logger?.info("📝 [processMessageWithAgent] Sending prompt to agent", {
        promptLength: userPrompt.length,
      });

      // Вызываем агента с использованием памяти для отслеживания диалога
      const response = await financialBotAgent.generateLegacy(
        [{ role: "user", content: userPrompt }],
        {
          resourceId: "telegram-bot", // Общий ресурс для бота
          threadId: inputData.threadId, // Уникальный ID для каждого пользователя
          maxSteps: 10, // Разрешаем многошаговые операции
        }
      );

      logger?.info("✅ [processMessageWithAgent] Agent response received", {
        responseLength: response.text.length,
      });

      return {
        success: true,
        response: response.text,
      };
    } catch (error: any) {
      logger?.error("❌ [processMessageWithAgent] Error processing message", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        response: "",
        error: error.message || "Unknown error occurred",
      };
    }
  },
});

/**
 * Шаг: Логирование результата
 */
const logResult = createStep({
  id: "log-result",
  description: "Logs the final result of the workflow execution",

  inputSchema: z.object({
    success: z.boolean(),
    response: z.string(),
    error: z.string().optional(),
    chatId: z.number(),
  }),

  outputSchema: z.object({
    completed: z.boolean(),
    summary: z.string(),
  }),

  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();

    if (inputData.success) {
      logger?.info("✅ [logResult] Workflow completed successfully", {
        chatId: inputData.chatId,
        responseLength: inputData.response.length,
      });

      return {
        completed: true,
        summary: `Successfully processed message for chat ${inputData.chatId}`,
      };
    } else {
      logger?.error("❌ [logResult] Workflow failed", {
        chatId: inputData.chatId,
        error: inputData.error,
      });

      return {
        completed: false,
        summary: `Failed to process message: ${inputData.error}`,
      };
    }
  },
});

/**
 * Telegram Bot Workflow
 * 
 * Основной workflow для обработки всех взаимодействий с Telegram ботом:
 * - Входящие сообщения от пользователей
 * - Нажатия на кнопки (callback queries)
 * - Команды (/start, /help, и т.д.)
 */
export const telegramBotWorkflow = createWorkflow({
  id: "telegram-bot-workflow",

  inputSchema: z.object({
    threadId: z.string().describe("Thread ID for conversation tracking"),
    chatId: z.number().describe("Telegram chat ID"),
    userId: z.number().describe("Telegram user ID"),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    message: z.string().optional(),
    messageId: z.number().optional(),
    callbackQueryId: z.string().optional(),
    callbackData: z.string().optional(),
    messageType: z.enum(["message", "callback_query"]),
  }) as any,

  outputSchema: z.object({
    completed: z.boolean(),
    summary: z.string(),
  }),
})
  .then(processMessageWithAgent as any)
  .then(logResult as any)
  .commit();

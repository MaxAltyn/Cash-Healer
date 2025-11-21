import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// Initialize Telegram Bot (without polling)
const bot = new TelegramBot(BOT_TOKEN);

/**
 * Tool for sending messages to Telegram with inline keyboard buttons
 */
export const sendTelegramMessage = createTool({
  id: "send-telegram-message",
  description:
    "Send a message to a Telegram chat with optional inline keyboard buttons. Use this to communicate with users and provide interactive menu options.",
  
  inputSchema: z.object({
    chatId: z.number().describe("Telegram chat ID to send the message to"),
    text: z.string().describe("Message text to send (supports Markdown)"),
    inlineKeyboard: z
      .array(
        z.array(
          z.object({
            text: z.string().describe("Button text"),
            callback_data: z.string().describe("Data to send when button is clicked"),
          })
        )
      )
      .optional()
      .describe("Optional inline keyboard buttons (array of rows, each row is an array of buttons)"),
    parseMode: z.enum(["Markdown", "HTML"]).optional().default("Markdown"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📤 [sendTelegramMessage] Sending message", {
      chatId: context.chatId,
      textLength: context.text.length,
    });

    try {
      const options: any = {
        parse_mode: context.parseMode,
      };

      if (context.inlineKeyboard && context.inlineKeyboard.length > 0) {
        options.reply_markup = {
          inline_keyboard: context.inlineKeyboard,
        };
      }

      const result = await bot.sendMessage(context.chatId, context.text, options);

      logger?.info("✅ [sendTelegramMessage] Message sent successfully", {
        messageId: result.message_id,
      });

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error: any) {
      logger?.error("❌ [sendTelegramMessage] Error sending message", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Tool for sending documents (PDF, Excel, etc.) to Telegram
 */
export const sendTelegramDocument = createTool({
  id: "send-telegram-document",
  description:
    "Send a document file (PDF, Excel, etc.) to a Telegram chat. Use this to deliver reports and files to users.",
  
  inputSchema: z.object({
    chatId: z.number().describe("Telegram chat ID to send the document to"),
    fileUrl: z.string().describe("URL or file path of the document to send"),
    caption: z.string().optional().describe("Optional caption for the document"),
    fileName: z.string().optional().describe("Optional custom file name"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📎 [sendTelegramDocument] Sending document", {
      chatId: context.chatId,
      fileUrl: context.fileUrl,
    });

    try {
      const options: any = {};
      
      if (context.caption) {
        options.caption = context.caption;
      }

      const result = await bot.sendDocument(
        context.chatId,
        context.fileUrl,
        options,
        {
          filename: context.fileName,
        }
      );

      logger?.info("✅ [sendTelegramDocument] Document sent successfully", {
        messageId: result.message_id,
      });

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error: any) {
      logger?.error("❌ [sendTelegramDocument] Error sending document", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Tool for answering callback queries (button clicks)
 */
export const answerCallbackQuery = createTool({
  id: "answer-callback-query",
  description:
    "Answer a callback query from an inline keyboard button click. Use this to acknowledge button presses.",
  
  inputSchema: z.object({
    callbackQueryId: z.string().describe("Callback query ID to answer"),
    text: z.string().optional().describe("Optional notification text to show to user"),
    showAlert: z.boolean().optional().default(false).describe("Whether to show text as an alert instead of notification"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔔 [answerCallbackQuery] Answering callback query", {
      callbackQueryId: context.callbackQueryId,
    });

    try {
      await bot.answerCallbackQuery(context.callbackQueryId, {
        text: context.text,
        show_alert: context.showAlert,
      });

      logger?.info("✅ [answerCallbackQuery] Callback query answered");

      return {
        success: true,
      };
    } catch (error: any) {
      logger?.error("❌ [answerCallbackQuery] Error answering callback query", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Tool for editing message text (e.g., updating menus after button click)
 */
export const editTelegramMessage = createTool({
  id: "edit-telegram-message",
  description:
    "Edit an existing message text and inline keyboard. Use this to update menus after button clicks.",
  
  inputSchema: z.object({
    chatId: z.number().describe("Telegram chat ID"),
    messageId: z.number().describe("Message ID to edit"),
    text: z.string().describe("New message text"),
    inlineKeyboard: z
      .array(
        z.array(
          z.object({
            text: z.string(),
            callback_data: z.string(),
          })
        )
      )
      .optional()
      .describe("Optional new inline keyboard"),
    parseMode: z.enum(["Markdown", "HTML"]).optional().default("Markdown"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("✏️ [editTelegramMessage] Editing message", {
      chatId: context.chatId,
      messageId: context.messageId,
    });

    try {
      const options: any = {
        chat_id: context.chatId,
        message_id: context.messageId,
        parse_mode: context.parseMode,
      };

      if (context.inlineKeyboard && context.inlineKeyboard.length > 0) {
        options.reply_markup = {
          inline_keyboard: context.inlineKeyboard,
        };
      }

      await bot.editMessageText(context.text, options);

      logger?.info("✅ [editTelegramMessage] Message edited successfully");

      return {
        success: true,
      };
    } catch (error: any) {
      logger?.error("❌ [editTelegramMessage] Error editing message", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

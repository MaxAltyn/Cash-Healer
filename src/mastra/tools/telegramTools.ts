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
            callback_data: z.string().optional().describe("Data to send when button is clicked (for callback buttons)"),
            web_app: z.object({
              url: z.string().describe("Web App URL to open"),
            }).optional().describe("Web App configuration for Mini Apps (for web_app buttons)"),
            url: z.string().optional().describe("HTTP or tg:// url to be opened (for URL buttons)"),
          })
        )
      )
      .optional()
      .describe("Optional inline keyboard buttons (array of rows, each row is an array of buttons). Each button must have text and exactly one of: callback_data, web_app, or url"),
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
        // Normalize buttons: remove undefined fields to match Telegram API requirements
        const normalizedKeyboard = context.inlineKeyboard.map(row =>
          row.map(button => {
            const normalized: any = { text: button.text };
            if (button.callback_data) normalized.callback_data = button.callback_data;
            if (button.web_app) normalized.web_app = button.web_app;
            if (button.url) normalized.url = button.url;
            return normalized;
          })
        );
        
        options.reply_markup = {
          inline_keyboard: normalizedKeyboard,
        };
        logger?.debug("📱 [sendTelegramMessage] Sending inline keyboard", {
          keyboard: JSON.stringify(normalizedKeyboard),
        });
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
      if (error.response && error.response.statusCode === 400) {
        logger?.warn("⚠️ [sendTelegramMessage] 400 Bad Request (non-retriable)", { 
          error: error.message,
          chatId: context.chatId 
        });
        return {
          success: false,
          error: error.message || "Bad request - chat not found or invalid",
        };
      }
      
      logger?.error("❌ [sendTelegramMessage] Error sending message", { error });
      throw error;
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
 * Tool for getting file information from Telegram
 */
export const getTelegramFile = createTool({
  id: "get-telegram-file",
  description:
    "Get file information from Telegram (file_id, file_path, file_size). Use this to download files uploaded by users.",
  
  inputSchema: z.object({
    fileId: z.string().describe("Telegram file ID"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    fileId: z.string().optional(),
    filePath: z.string().optional(),
    fileSize: z.number().optional(),
    fileUrl: z.string().optional().describe("Full download URL for the file"),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📥 [getTelegramFile] Getting file info", {
      fileId: context.fileId,
    });

    try {
      const file = await bot.getFile(context.fileId);
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

      logger?.info("✅ [getTelegramFile] File info retrieved", {
        fileId: file.file_id,
        filePath: file.file_path,
        fileSize: file.file_size,
      });

      return {
        success: true,
        fileId: file.file_id,
        filePath: file.file_path,
        fileSize: file.file_size,
        fileUrl: fileUrl,
      };
    } catch (error: any) {
      logger?.error("❌ [getTelegramFile] Error getting file", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Tool for forwarding files from one chat to another
 */
export const forwardTelegramDocument = createTool({
  id: "forward-telegram-document",
  description:
    "Forward a document using file_id from one chat to another. More efficient than downloading and re-uploading.",
  
  inputSchema: z.object({
    chatId: z.number().describe("Destination chat ID"),
    fileId: z.string().describe("Telegram file ID to forward"),
    caption: z.string().optional().describe("Optional caption for the document"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📎 [forwardTelegramDocument] Forwarding document", {
      chatId: context.chatId,
      fileId: context.fileId,
    });

    try {
      const options: any = {};
      
      if (context.caption) {
        options.caption = context.caption;
      }

      const result = await bot.sendDocument(
        context.chatId,
        context.fileId,
        options
      );

      logger?.info("✅ [forwardTelegramDocument] Document forwarded successfully", {
        messageId: result.message_id,
      });

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error: any) {
      logger?.error("❌ [forwardTelegramDocument] Error forwarding document", { error });
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

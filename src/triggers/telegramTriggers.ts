import type { ContentfulStatusCode } from "hono/utils/http-status";

import { Mastra } from "@mastra/core";

// Note: TELEGRAM_BOT_TOKEN check moved to runtime to allow server to start for healthchecks

export type TriggerInfoTelegramMessage = {
  type: "telegram/message" | "telegram/callback_query" | "telegram/document";
  params: {
    chatId: number;
    userId: number;
    userName?: string;
    firstName?: string;
    lastName?: string;
    message?: string;
    messageId?: number;
    callbackQueryId?: string;
    callbackData?: string;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    caption?: string;
  };
  payload: any;
};

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (
    mastra: Mastra,
    triggerInfo: TriggerInfoTelegramMessage,
  ) => Promise<void>;
}) {
  return [
    {
      path: "/api/webhooks/telegram/action",
      method: "POST" as const,
      createHandler: async ({ mastra }: { mastra: Mastra }) => async (c: any) => {
        const logger = mastra.getLogger();
        
        // Check for bot token at runtime
        if (!process.env.TELEGRAM_BOT_TOKEN) {
          logger?.warn("⚠️ [Telegram] TELEGRAM_BOT_TOKEN not configured, webhook disabled");
          return c.json({ error: "Bot not configured" }, 503);
        }
        
        try {
          const payload = await c.req.json();

          logger?.info("📝 [Telegram] payload", payload);

          // Handle callback queries (button clicks)
          if (payload.callback_query) {
            const callbackQuery = payload.callback_query;
            
            // IMPORTANT: Answer callback query immediately to prevent Telegram timeout
            // Telegram requires response within 10 seconds
            const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
            try {
              await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: callbackQuery.id,
                  }),
                }
              );
              logger?.info("✅ [Telegram] Callback query answered");
            } catch (error) {
              logger?.error("❌ [Telegram] Failed to answer callback query", { error });
            }
            
            // Process the callback query asynchronously (don't wait)
            handler(mastra, {
              type: "telegram/callback_query",
              params: {
                chatId: callbackQuery.message.chat.id,
                userId: callbackQuery.from.id,
                userName: callbackQuery.from.username || "",
                firstName: callbackQuery.from.first_name || "",
                lastName: callbackQuery.from.last_name || "",
                messageId: callbackQuery.message.message_id,
                callbackQueryId: callbackQuery.id,
                callbackData: callbackQuery.data,
              },
              payload,
            }).catch((error) => {
              logger?.error("❌ [Telegram] Error handling callback query", { error });
            });
          }
          // Handle document messages (file uploads) - Check BEFORE regular messages
          else if (payload.message && payload.message.document) {
            await handler(mastra, {
              type: "telegram/document",
              params: {
                chatId: payload.message.chat.id,
                userId: payload.message.from.id,
                userName: payload.message.from.username || "",
                firstName: payload.message.from.first_name || "",
                lastName: payload.message.from.last_name || "",
                messageId: payload.message.message_id,
                fileId: payload.message.document.file_id,
                fileName: payload.message.document.file_name || "unknown",
                fileSize: payload.message.document.file_size || 0,
                caption: payload.message.caption || "",
              },
              payload,
            });
          }
          // Handle regular messages
          else if (payload.message) {
            await handler(mastra, {
              type: "telegram/message",
              params: {
                chatId: payload.message.chat.id,
                userId: payload.message.from.id,
                userName: payload.message.from.username || "",
                firstName: payload.message.from.first_name || "",
                lastName: payload.message.from.last_name || "",
                message: payload.message.text,
                messageId: payload.message.message_id,
              },
              payload,
            });
          }

          return c.text("OK", 200);
        } catch (error) {
          logger?.error("Error handling Telegram webhook:", error);
          return c.text("Internal Server Error", 500);
        }
      },
    },
  ];
}

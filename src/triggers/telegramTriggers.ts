import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

export type TriggerInfoTelegramMessage = {
  type: "telegram/message" | "telegram/callback_query";
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
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const logger = mastra.getLogger();
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
    }),
  ];
}

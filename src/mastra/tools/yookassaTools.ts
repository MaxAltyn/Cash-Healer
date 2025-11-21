import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";
const YOOKASSA_TEST_MODE = process.env.YOOKASSA_TEST_MODE === "true";

/**
 * Генерирует Basic Auth заголовок для ЮKassa API
 */
function getYooKassaAuthHeader(): string {
  const credentials = `${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

/**
 * Инструмент для создания платежа через ЮKassa
 */
export const createYooKassaPayment = createTool({
  id: "create-yookassa-payment",
  description:
    "Create a payment through YooKassa payment gateway. Returns a payment URL that the user can use to complete the payment.",
  
  inputSchema: z.object({
    amount: z.number().describe("Payment amount in rubles (will be converted to kopecks)"),
    currency: z.string().default("RUB").describe("Currency code (default: RUB)"),
    description: z.string().describe("Payment description"),
    returnUrl: z.string().optional().describe("URL to redirect user after payment"),
    metadata: z.record(z.string()).optional().describe("Additional metadata to store with payment"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    paymentId: z.string().optional(),
    paymentUrl: z.string().optional(),
    status: z.string().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("💳 [createYooKassaPayment] Creating payment", {
      amount: context.amount,
      description: context.description,
      testMode: YOOKASSA_TEST_MODE,
    });

    try {
      // ТЕСТОВЫЙ РЕЖИМ: Имитация платежа
      if (YOOKASSA_TEST_MODE) {
        const testPaymentId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        logger?.info("🧪 [createYooKassaPayment] TEST MODE - Simulating payment creation", {
          paymentId: testPaymentId,
        });
        
        return {
          success: true,
          paymentId: testPaymentId,
          paymentUrl: `https://test.yookassa.ru/payments/${testPaymentId}`,
          status: "pending",
        };
      }

      // Генерируем уникальный idempotence key
      const idempotenceKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Конвертируем рубли в копейки
      const amountInKopecks = Math.round(context.amount * 100);

      const paymentData = {
        amount: {
          value: (amountInKopecks / 100).toFixed(2),
          currency: context.currency,
        },
        confirmation: {
          type: "redirect",
          return_url: context.returnUrl || "https://example.com/success",
        },
        capture: true,
        description: context.description,
        metadata: context.metadata || {},
      };

      logger?.info("📝 [createYooKassaPayment] Payment data", paymentData);

      const response = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotence-Key": idempotenceKey,
          Authorization: getYooKassaAuthHeader(),
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger?.error("❌ [createYooKassaPayment] YooKassa API error", {
          status: response.status,
          error: errorText,
        });
        return {
          success: false,
          error: `YooKassa API error: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();

      logger?.info("✅ [createYooKassaPayment] Payment created successfully", {
        paymentId: result.id,
        status: result.status,
      });

      return {
        success: true,
        paymentId: result.id,
        paymentUrl: result.confirmation?.confirmation_url,
        status: result.status,
      };
    } catch (error: any) {
      logger?.error("❌ [createYooKassaPayment] Error creating payment", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Инструмент для проверки статуса платежа
 */
export const checkYooKassaPayment = createTool({
  id: "check-yookassa-payment",
  description:
    "Check the status of a YooKassa payment by payment ID. Use this to verify if a payment has been completed.",
  
  inputSchema: z.object({
    paymentId: z.string().describe("YooKassa payment ID to check"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    status: z.string().optional(),
    paid: z.boolean().optional(),
    amount: z.number().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔍 [checkYooKassaPayment] Checking payment status", {
      paymentId: context.paymentId,
      testMode: YOOKASSA_TEST_MODE,
    });

    try {
      // ТЕСТОВЫЙ РЕЖИМ: Автоматически считаем платеж успешным
      if (YOOKASSA_TEST_MODE || context.paymentId.startsWith("test_")) {
        logger?.info("🧪 [checkYooKassaPayment] TEST MODE - Auto-confirming payment", {
          paymentId: context.paymentId,
        });
        
        return {
          success: true,
          status: "succeeded",
          paid: true,
          amount: 450, // Тестовая сумма
        };
      }

      const response = await fetch(
        `https://api.yookassa.ru/v3/payments/${context.paymentId}`,
        {
          method: "GET",
          headers: {
            Authorization: getYooKassaAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger?.error("❌ [checkYooKassaPayment] YooKassa API error", {
          status: response.status,
          error: errorText,
        });
        return {
          success: false,
          error: `YooKassa API error: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();

      logger?.info("✅ [checkYooKassaPayment] Payment status retrieved", {
        paymentId: result.id,
        status: result.status,
        paid: result.paid,
      });

      return {
        success: true,
        status: result.status,
        paid: result.paid || false,
        amount: result.amount ? parseFloat(result.amount.value) : undefined,
      };
    } catch (error: any) {
      logger?.error("❌ [checkYooKassaPayment] Error checking payment", { error });
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

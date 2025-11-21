import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";
const YOOKASSA_TEST_MODE = process.env.YOOKASSA_TEST_MODE === "true";
const YOOKASSA_MOCK_MODE = process.env.YOOKASSA_MOCK_MODE === "true";

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
    description: z.string().describe("Payment description"),
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
      mockMode: YOOKASSA_MOCK_MODE,
      shopId: YOOKASSA_SHOP_ID,
    });

    try {
      // MOCK MODE: Возвращаем фейковые данные для тестирования
      if (YOOKASSA_MOCK_MODE) {
        const mockPaymentId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const mockPaymentUrl = `https://mock-payment.example.com/pay/${mockPaymentId}`;
        
        logger?.info("🎭 [createYooKassaPayment] MOCK MODE: Returning fake payment", {
          paymentId: mockPaymentId,
          paymentUrl: mockPaymentUrl,
        });
        
        return {
          success: true,
          paymentId: mockPaymentId,
          paymentUrl: mockPaymentUrl,
          status: "pending",
        };
      }

      // Проверяем наличие credentials
      if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
        logger?.error("❌ [createYooKassaPayment] Missing YooKassa credentials");
        return {
          success: false,
          error: "YooKassa credentials not configured",
        };
      }

      // Генерируем уникальный idempotence key
      const idempotenceKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Конвертируем рубли в копейки
      const amountInKopecks = Math.round(context.amount * 100);

      const paymentData = {
        amount: {
          value: (amountInKopecks / 100).toFixed(2),
          currency: "RUB",
        },
        confirmation: {
          type: "redirect",
          return_url: "https://t.me/CashHealer_bot",
        },
        capture: true,
        description: context.description,
        test: YOOKASSA_TEST_MODE,
      };

      logger?.info("📝 [createYooKassaPayment] Payment data", paymentData);

      logger?.info("🌐 [createYooKassaPayment] Sending request to YooKassa API", {
        url: "https://api.yookassa.ru/v3/payments",
        idempotenceKey,
      });

      const response = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotence-Key": idempotenceKey,
          Authorization: getYooKassaAuthHeader(),
        },
        body: JSON.stringify(paymentData),
      });

      logger?.info("📡 [createYooKassaPayment] YooKassa API response received", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger?.error("❌ [createYooKassaPayment] YooKassa API error", {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          requestData: paymentData,
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
      logger?.error("❌ [createYooKassaPayment] Exception creating payment", {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
      });
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
      mockMode: YOOKASSA_MOCK_MODE,
    });

    try {
      // MOCK MODE: Возвращаем фейковые данные для тестирования
      if (YOOKASSA_MOCK_MODE) {
        // Для mock платежей автоматически считаем их оплаченными
        const isMockPayment = context.paymentId.startsWith("mock_");
        
        logger?.info("🎭 [checkYooKassaPayment] MOCK MODE: Returning fake status", {
          paymentId: context.paymentId,
          isMockPayment,
          status: "succeeded",
          paid: true,
        });
        
        return {
          success: true,
          status: "succeeded",
          paid: true,
          amount: 450, // Можно сделать динамически, но для тестирования подойдет
        };
      }

      // Проверяем наличие credentials
      if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
        logger?.error("❌ [checkYooKassaPayment] Missing YooKassa credentials");
        return {
          success: false,
          error: "YooKassa credentials not configured",
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

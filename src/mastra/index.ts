import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";

// Storage removed - not needed for basic bot functionality
// import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe } from "./inngest";
import { telegramBotWorkflow } from "./workflows/telegramBotWorkflow";
import { financialBotAgent } from "./agents/financialBotAgent";
import { registerTelegramTrigger } from "../triggers/telegramTriggers";
import { financialModelingHtml } from "./financialModelingHtml";
import { handleTelegramMessageDirect } from "./productionHandler";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

// Import tools
import { sendTelegramMessage } from "./tools/telegramTools";
import { createYooKassaPayment, checkYooKassaPayment } from "./tools/yookassaTools";
import {
  createOrUpdateUserTool,
  getUserByTelegramIdTool,
  getUserOrdersTool,
  getOrderByIdTool,
  updateOrderStatusTool,
  createOrderWithPaymentTransactionTool,
  getPendingOrdersTool,
} from "./tools/databaseTools";

class ProductionPinoLogger extends MastraLogger {
  protected logger: pino.Logger;

  constructor(
    options: {
      name?: string;
      level?: LogLevel;
    } = {},
  ) {
    super(options);

    this.logger = pino({
      name: options.name || "app",
      level: options.level || LogLevel.INFO,
      base: {},
      formatters: {
        level: (label: string, _number: number) => ({
          level: label,
        }),
      },
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  debug(message: string, args: Record<string, any> = {}): void {
    this.logger.debug(args, message);
  }

  info(message: string, args: Record<string, any> = {}): void {
    this.logger.info(args, message);
  }

  warn(message: string, args: Record<string, any> = {}): void {
    this.logger.warn(args, message);
  }

  error(message: string, args: Record<string, any> = {}): void {
    this.logger.error(args, message);
  }
}

// ======================================================================
// AUTOMATIC TELEGRAM WEBHOOK SETUP ON SERVER START
// ======================================================================
function getHostUrl(): string | null {
  if (process.env.HOST_URL) {
    return process.env.HOST_URL.replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return null;
}

async function setupTelegramWebhookOnStart() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.log("ℹ️ [Telegram] TELEGRAM_BOT_TOKEN not set - bot functionality disabled. Add this secret to enable Telegram bot.");
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const hostUrl = getHostUrl();
    if (!hostUrl) {
      console.warn("⚠️ [Telegram] No host URL found (HOST_URL, RAILWAY_PUBLIC_DOMAIN, REPLIT_DOMAINS), skipping webhook setup");
      return;
    }

    const webhookUrl = `${hostUrl}/api/webhooks/telegram/action`;
    
    const webhookInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoRes.json();
    
    if (webhookInfo.ok && webhookInfo.result?.url !== webhookUrl) {
      console.log(`🔄 [Telegram] Updating webhook from ${webhookInfo.result?.url || 'none'} to ${webhookUrl}`);
      
      const setWebhookRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const setWebhookResult = await setWebhookRes.json();
      
      if (setWebhookResult.ok) {
        console.log(`✅ [Telegram] Webhook successfully set to: ${webhookUrl}`);
      } else {
        console.error(`❌ [Telegram] Failed to set webhook:`, setWebhookResult);
      }
    } else {
      console.log(`✅ [Telegram] Webhook already configured: ${webhookUrl}`);
    }
  } catch (error: any) {
    console.error(`❌ [Telegram] Webhook setup error:`, error.message);
  }
}

// Call webhook setup on module load
setupTelegramWebhookOnStart();

export const mastra = new Mastra({
  // Storage disabled to avoid PostgreSQL dependency in production
  // Workflows will not persist across restarts, but basic functionality works
  // Register your workflows here
  workflows: {
    telegramBotWorkflow,
  },
  // Register your agents here
  agents: {
    financialBotAgent,
  },
  mcpServers: {
    allTools: new MCPServer({
      name: "allTools",
      version: "1.0.0",
      tools: {},
    }),
  },
  bundler: {
    // A few dependencies are not properly picked up by
    // the bundler if they are not added directly to the
    // entrypoint.
    externals: [
      "@slack/web-api",
      "inngest",
      "inngest/hono",
      "hono",
      "hono/streaming",
    ],
    // sourcemaps are good for debugging.
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5000", 10),
    middleware: [
      async (c, next) => {
        const mastra = c.get("mastra");
        const logger = mastra?.getLogger();
        logger?.debug("[Request]", { method: c.req.method, url: c.req.url });
        try {
          await next();
        } catch (error) {
          logger?.error("[Response]", {
            method: c.req.method,
            url: c.req.url,
            error,
          });
          if (error instanceof MastraError) {
            if (error.id === "AGENT_MEMORY_MISSING_RESOURCE_ID") {
              // This is typically a non-retirable error. It means that the request was not
              // setup correctly to pass in the necessary parameters.
              throw new NonRetriableError(error.message, { cause: error });
            }
          } else if (error instanceof z.ZodError) {
            // Validation errors are never retriable.
            throw new NonRetriableError(error.message, { cause: error });
          }

          throw error;
        }
      },
    ],
    apiRoutes: [
      // ======================================================================
      // HEALTH CHECK ENDPOINT FOR RAILWAY/DEPLOYMENT
      // ======================================================================
      {
        path: "/api",
        method: "GET",
        createHandler: async () => async (c) => {
          return c.json({ 
            status: "ok", 
            timestamp: new Date().toISOString(),
            telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN,
            database_configured: !!process.env.DATABASE_URL,
          });
        },
      },
      {
        path: "/health",
        method: "GET",
        createHandler: async () => async (c) => {
          return c.json({ status: "healthy", timestamp: new Date().toISOString() });
        },
      },

      // ======================================================================
      // Inngest Integration Endpoint
      // ======================================================================
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },

      // ======================================================================
      // Connector Webhook Triggers
      // ======================================================================
      // Register your connector webhook handlers here using the spread operator.
      // Each connector trigger should be defined in src/triggers/{connectorName}Triggers.ts
      //
      // PATTERN FOR ADDING A NEW CONNECTOR TRIGGER:
      //
      // 1. Create a trigger file: src/triggers/{connectorName}Triggers.ts
      //    (See src/triggers/exampleConnectorTrigger.ts for a complete example)
      //
      // 2. Create a workflow: src/mastra/workflows/{connectorName}Workflow.ts
      //    (See src/mastra/workflows/linearIssueWorkflow.ts for an example)
      //
      // 3. Import both in this file:
      //    ```typescript
      //    import { register{ConnectorName}Trigger } from "../triggers/{connectorName}Triggers";
      //    import { {connectorName}Workflow } from "./workflows/{connectorName}Workflow";
      //    ```
      //
      // 4. Register the trigger in the apiRoutes array below:
      //    ```typescript
      //    ...register{ConnectorName}Trigger({
      //      triggerType: "{connector}/{event.type}",
      //      handler: async (mastra, triggerInfo) => {
      //        const logger = mastra.getLogger();
      //        logger?.info("🎯 [{Connector} Trigger] Processing {event}", {
      //          // Log relevant fields from triggerInfo.params
      //        });
      //
      //        // Create a unique thread ID for this event
      //        const threadId = `{connector}-{event}-${triggerInfo.params.someUniqueId}`;
      //
      //        // Start the workflow
      //        const run = await {connectorName}Workflow.createRunAsync();
      //        return await run.start({
      //          inputData: {
      //            threadId,
      //            ...triggerInfo.params,
      //          },
      //        });
      //      }
      //    })
      //    ```
      //
      // ======================================================================
      // EXAMPLE: Linear Issue Creation Webhook
      // ======================================================================
      // Uncomment to enable Linear webhook integration:
      //
      // ...registerLinearTrigger({
      //   triggerType: "linear/issue.created",
      //   handler: async (mastra, triggerInfo) => {
      //     // Extract what you need from the full payload
      //     const data = triggerInfo.payload?.data || {};
      //     const title = data.title || "Untitled";
      //
      //     // Start your workflow
      //     const run = await exampleWorkflow.createRunAsync();
      //     return await run.start({
      //       inputData: {
      //         message: `Linear Issue: ${title}`,
      //         includeAnalysis: true,
      //       }
      //     });
      //   }
      // }),
      //
      // To activate:
      // 1. Uncomment the code above
      // 2. Import at the top: import { registerLinearTrigger } from "../triggers/exampleConnectorTrigger";
      //
      // ======================================================================

      // ======================================================================
      // TELEGRAM WEBHOOK SETUP ENDPOINT
      // ======================================================================
      {
        path: "/api/telegram/setup-webhook",
        method: "GET",
        createHandler: async ({ mastra }) => async (c) => {
          const logger = mastra.getLogger();
          const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          
          if (!BOT_TOKEN) {
            return c.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, 500);
          }
          
          try {
            const botInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
            const botInfo = await botInfoRes.json();
            
            if (!botInfo.ok) {
              return c.json({ ok: false, error: "Invalid bot token", details: botInfo }, 401);
            }
            
            const webhookInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
            const webhookInfo = await webhookInfoRes.json();
            
            const hostUrl = getHostUrl();
            if (!hostUrl) {
              return c.json({ ok: false, error: "No HOST_URL or RAILWAY_PUBLIC_DOMAIN configured" }, 500);
            }
            const webhookUrl = `${hostUrl}/api/webhooks/telegram/action`;
            
            const setWebhookRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: webhookUrl }),
            });
            const setWebhookResult = await setWebhookRes.json();
            
            logger?.info("📡 [Telegram] Webhook setup", { botInfo, webhookUrl, setWebhookResult });
            
            return c.json({
              ok: true,
              bot: botInfo.result,
              webhook_url: webhookUrl,
              set_webhook_result: setWebhookResult,
              current_webhook: webhookInfo.result,
            });
          } catch (error: any) {
            logger?.error("❌ [Telegram] Webhook setup failed", { error: error.message });
            return c.json({ ok: false, error: error.message }, 500);
          }
        },
      },

      // ======================================================================
      // FINANCIAL MODELING MINI APP STATIC FILES
      // ======================================================================
      {
        path: "/financial-modeling.html",
        method: "GET",
        createHandler: async () => async (c) => {
          return new Response(financialModelingHtml, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        },
      },
      {
        path: "/financial-modeling.js",
        method: "GET",
        createHandler: async () => async (c) => {
          try {
            // In dev mode, cwd is /workspace
            // In compiled mode, cwd is /workspace/.mastra/output, so go up 2 levels
            const cwd = process.cwd();
            const isCompiled = cwd.includes('.mastra/output');
            const projectRoot = isCompiled ? path.join(cwd, '../..') : cwd;
            const jsPath = path.join(projectRoot, 'src/mastra/financialModeleling.js');
            const jsContent = fs.readFileSync(jsPath, 'utf-8');
            return new Response(jsContent, {
              headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              },
            });
          } catch (error: any) {
            return new Response(`console.error('Failed to load script: ${error.message}');`, {
              status: 500,
              headers: { 'Content-Type': 'application/javascript' },
            });
          }
        },
      },

      // ======================================================================
      // FINANCIAL MODELING MINI APP API
      // ======================================================================
      {
        path: "/api/financial-modeling/save",
        method: "POST",
        createHandler: async ({ mastra }) => async (c) => {
          const logger = mastra.getLogger();
          
          try {
            const body = await c.req.json();
            logger?.info("📊 [Financial Modeling] Received data", { 
              userId: body.userId,
              orderId: body.orderId,
              currentBalance: body.currentBalance,
              expensesCount: body.expenses?.length,
              wishesCount: body.wishes?.length,
            });

            // Validate required fields
            if (!body.userId) {
              return c.json({ success: false, error: "Missing userId" }, 400);
            }

            const telegramId = body.userId; // Keep as string
            const orderId = body.orderId ? parseInt(body.orderId) : null;

            logger?.info("👤 [Financial Modeling] Processing for telegram user", {
              telegramId,
              orderId,
            });

            // Get or create user in database
            const { getUserByTelegramId, createOrUpdateUser } = await import("../../server/storage");
            let user = await getUserByTelegramId(telegramId);
            
            if (!user) {
              // Create user if doesn't exist
              user = await createOrUpdateUser({
                telegramId,
                username: `user${telegramId}`,
                firstName: "User",
                lastName: "",
              });
              logger?.info("✨ [Financial Modeling] Created new user", { userId: user.id });
            }

            logger?.info("👤 [Financial Modeling] Processing for user", {
              userId: user.id,
              telegramId,
              orderId,
            });

            // Save financial model
            const { createOrUpdateFinancialModel } = await import("../../server/storage");
            const model = await createOrUpdateFinancialModel({
              userId: user.id,
              orderId,
              currentBalance: Math.round(body.currentBalance || 0),
              nextIncome: Math.round(body.nextIncome || 0),
              nextIncomeDate: body.nextIncomeDate || null,
              expenses: JSON.stringify(body.expenses || []),
              wishes: JSON.stringify(body.wishes || []),
              totalExpenses: Math.round(body.totalExpenses || 0),
            });

            logger?.info("✅ [Financial Modeling] Model saved", { modelId: model.id });

            // Generate AI analysis with new structure
           async function analyzeBudgetWithFallback(context: any, mastra: any, runtimeContext: any) {
            try {
              // Пробуем использовать DeepSeek если настроен
              if (process.env.DEEPSEEK_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
                const { analyzeBudgetTool } = await import("./tools/budgetAnalysisTools");
                const result = await analyzeBudgetTool.execute({
                  context,
                  mastra,
                  runtimeContext,
                });
                
                if (result.success) {
                  return result;
                }
              }
              
              // Фолбэк: статический анализ без AI
              const expensesList = context.expenses || [];
              const wishesList = context.wishes || [];
              const dailyBudget = context.dailyBudget || 0;
              
              const analysis = `## 📊 Анализ вашего бюджета
          
          **Текущий баланс:** ${context.currentBalance.toLocaleString('ru-RU')} ₽
          **До следующего дохода:** ${context.daysUntilIncome} дней
          **Ежедневный бюджет:** ${dailyBudget.toLocaleString('ru-RU')} ₽/день
          
          ### 💡 Основные выводы:
          ${dailyBudget > 5000 ? '✅ Отличный дневной бюджет!' : dailyBudget > 2000 ? '📊 Хороший дневной бюджет' : '💡 Есть куда расти'}
          
          ### 🎯 Рекомендации:
          1. **Отложите 10%** от остатка на непредвиденные расходы
          2. **Приоритетные расходы:** оплата ЖКХ, кредиты, продукты
          3. **Отложите покупки** с низким приоритетом
          4. **Используйте ежедневный лимит** ${dailyBudget.toFixed(0)} ₽
          
          ### 📈 Для улучшения бюджета:
          - Пересмотрите категории расходов
          - Ищите способы дополнительного заработка
          - Планируйте покупки заранее
          
          *Для более детального AI-анализа настройте API ключ в настройках.*`;
              
              return { success: true, analysis };
              
            } catch (error) {
              // В случае ошибки возвращаем простой анализ
              return {
                success: true,
                analysis: `📊 **Базовый анализ бюджета**\n\nВаш дневной бюджет: ${context.dailyBudget?.toFixed(0) || 0} ₽\n\n💡 Совет: старайтесь тратить не более этой суммы в день.`
              };
            }
          }
            
            const expensesList = (body.expenses || []).map((e: any) => 
              `${e.name}: ${e.amount}₽`
            ).join(', ');
            
            const wishesList = (body.wishes || []).map((w: any) => {
              const priorityEmoji = w.priority === 'high' ? '🔴' : w.priority === 'low' ? '🟢' : '🟡';
              return `${w.name} (${w.price}₽, приоритет: ${priorityEmoji})`;
            }).join(', ');

            const today = new Date();
            const incomeDate = body.nextIncomeDate ? new Date(body.nextIncomeDate) : new Date();
            const daysUntilIncome = Math.max(1, Math.ceil((incomeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            
            const afterExpenses = body.currentBalance - body.totalExpenses;
            const dailyBudget = Math.max(0, afterExpenses) / daysUntilIncome;

            const analysisResult = await analyzeBudgetWithFallback({
              currentBalance: body.currentBalance || 0,
              daysUntilIncome,
              dailyBudget,
              expenses: expensesList,
              wishes: wishesList,
            }, mastra, c as any);

            if (!analysisResult.success) {
              throw new Error(analysisResult.error || "Failed to generate analysis");
            }

            return c.json({
              success: true,
              analysis: analysisResult.analysis,
            });
          } catch (error: any) {
            logger?.error("❌ [Financial Modeling] Error", { error: error.message, stack: error.stack });
            return c.json(
              { success: false, error: error.message },
              500
            );
          }
        },
      },

      // ======================================================================
      // TELEGRAM BOT WEBHOOK
      // ======================================================================
      ...registerTelegramTrigger({
        triggerType: "telegram/message",
        handler: async (mastra, triggerInfo) => {
          const logger = mastra.getLogger();
          logger?.info("🎯 [Telegram Trigger] Processing message", {
            chatId: triggerInfo.params.chatId,
            userId: triggerInfo.params.userId,
            type: triggerInfo.type,
            isProduction: process.env.NODE_ENV === "production",
          });

          // Create unique thread ID for each user
          const threadId = `telegram-user-${triggerInfo.params.userId}`;

          // Determine message type
          let messageType: "message" | "callback_query" | "document" = "message";
          if (triggerInfo.type === "telegram/callback_query") {
            messageType = "callback_query";
          } else if (triggerInfo.type === "telegram/document") {
            messageType = "document";
          }

          // In production, use direct handler (no Inngest)
          // In development, use Inngest workflow
          const isProduction = process.env.NODE_ENV === "production";
          
          if (isProduction) {
            logger?.info("🚀 [Telegram Trigger] Using production direct handler");
            await handleTelegramMessageDirect(mastra, {
              threadId,
              chatId: triggerInfo.params.chatId,
              userId: triggerInfo.params.userId,
              userName: triggerInfo.params.userName,
              firstName: triggerInfo.params.firstName,
              lastName: triggerInfo.params.lastName,
              message: triggerInfo.params.message,
              messageId: triggerInfo.params.messageId,
              callbackQueryId: triggerInfo.params.callbackQueryId,
              callbackData: triggerInfo.params.callbackData,
              messageType,
              fileId: triggerInfo.params.fileId,
              fileName: triggerInfo.params.fileName,
              fileSize: triggerInfo.params.fileSize,
              caption: triggerInfo.params.caption,
            }, {});
            logger?.info("✅ [Telegram Trigger] Production handler completed");
          } else {
            // Development mode - use Inngest workflow
            try {
              const run = await telegramBotWorkflow.createRunAsync();
              const result = await run.start({
                inputData: {
                  threadId,
                  chatId: triggerInfo.params.chatId,
                  userId: triggerInfo.params.userId,
                  userName: triggerInfo.params.userName,
                  firstName: triggerInfo.params.firstName,
                  lastName: triggerInfo.params.lastName,
                  message: triggerInfo.params.message,
                  messageId: triggerInfo.params.messageId,
                  callbackQueryId: triggerInfo.params.callbackQueryId,
                  callbackData: triggerInfo.params.callbackData,
                  messageType,
                  fileId: triggerInfo.params.fileId,
                  fileName: triggerInfo.params.fileName,
                  fileSize: triggerInfo.params.fileSize,
                  caption: triggerInfo.params.caption,
                },
              });

              logger?.info("✅ [Telegram Trigger] Workflow completed", {
                status: result.status,
                chatId: triggerInfo.params.chatId,
              });
            } catch (error: any) {
              logger?.error("❌ [Telegram Trigger] Workflow failed", {
                error: error.message,
                stack: error.stack,
                chatId: triggerInfo.params.chatId,
              });
            }
          }
        },
      }),
    ],
  },
  logger:
    process.env.NODE_ENV === "production"
      ? new ProductionPinoLogger({
          name: "Mastra",
          level: "info",
        })
      : new PinoLogger({
          name: "Mastra",
          level: "info",
        }),
});

/*  Sanity check 1: Throw an error if there are more than 1 workflows.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getWorkflows()).length > 1) {
  throw new Error(
    "More than 1 workflows found. Currently, more than 1 workflows are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

/*  Sanity check 2: Throw an error if there are more than 1 agents.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getAgents()).length > 1) {
  throw new Error(
    "More than 1 agents found. Currently, more than 1 agents are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

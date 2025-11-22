import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe } from "./inngest";
import { telegramBotWorkflow } from "./workflows/telegramBotWorkflow";
import { financialBotAgent } from "./agents/financialBotAgent";
import { registerTelegramTrigger } from "../triggers/telegramTriggers";

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

export const mastra = new Mastra({
  storage: sharedPostgresStorage,
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
    port: 5000,
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
              hasInitData: !!body.initData,
              balance: body.balance,
            });

            // Parse Telegram initData (verify user)
            const initData = body.initData;
            if (!initData) {
              return c.json({ success: false, error: "Missing initData" }, 401);
            }

            // Parse initData to get user info (simplified - in production use crypto verification)
            const params = new URLSearchParams(initData);
            const userJson = params.get("user");
            if (!userJson) {
              return c.json({ success: false, error: "Invalid user data" }, 401);
            }

            const user = JSON.parse(userJson);
            const telegramId = user.id.toString();

            logger?.info("👤 [Financial Modeling] User identified", {
              telegramId,
              username: user.username,
            });

            // Get user from database
            const { getUserByTelegramId, createOrUpdateFinancialModel } = await import("../../server/storage");
            const dbUser = await getUserByTelegramId(telegramId);

            if (!dbUser) {
              return c.json({ success: false, error: "User not found" }, 404);
            }

            // Convert to kopecks (cents)
            const balanceKopecks = Math.round((body.balance || 0) * 100);
            const incomeKopecks = Math.round((body.income || 0) * 100);
            const expensesKopecks = Math.round((body.expenses || 0) * 100);
            const goalKopecks = body.goal ? Math.round(body.goal * 100) : 0;

            // Save financial model
            const model = await createOrUpdateFinancialModel({
              userId: dbUser.id,
              currentBalance: balanceKopecks,
              monthlyIncome: incomeKopecks,
              monthlyExpenses: expensesKopecks,
              savingsGoal: goalKopecks,
              notes: body.notes || "",
            });

            logger?.info("✅ [Financial Modeling] Model saved", { modelId: model.id });

            // Generate AI analysis
            const { analyzeBudgetTool } = await import("./tools/budgetAnalysisTools");
            const analysisResult = await analyzeBudgetTool.execute({
              context: {
                currentBalance: body.balance || 0,
                monthlyIncome: body.income || 0,
                monthlyExpenses: body.expenses || 0,
                savingsGoal: body.goal,
                notes: body.notes,
              },
              runtimeContext: {},
              mastra,
            });

            if (!analysisResult.success) {
              throw new Error(analysisResult.error || "Failed to generate analysis");
            }

            return c.json({
              success: true,
              analysis: analysisResult.analysis,
            });
          } catch (error: any) {
            logger?.error("❌ [Financial Modeling] Error", { error });
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

          // Start the workflow
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

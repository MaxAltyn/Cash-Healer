import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openai = createOpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const analyzeBudgetTool = createTool({
  id: "analyze-budget",
  description: "Analyze user's financial model and provide personalized recommendations",
  inputSchema: z.object({
    currentBalance: z.number().describe("Current balance in rubles"),
    monthlyIncome: z.number().describe("Monthly income in rubles"),
    monthlyExpenses: z.number().describe("Monthly expenses in rubles"),
    savingsGoal: z.number().optional().describe("Savings goal in rubles"),
    notes: z.string().optional().describe("Additional notes from user"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.string(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🤖 [analyzeBudgetTool] Analyzing budget", {
      income: context.monthlyIncome,
      expenses: context.monthlyExpenses,
    });

    try {
      const monthlySavings = context.monthlyIncome - context.monthlyExpenses;
      const savingsRate = context.monthlyIncome > 0 
        ? ((monthlySavings / context.monthlyIncome) * 100).toFixed(1)
        : "0";

      let goalAnalysis = "";
      if (context.savingsGoal && context.savingsGoal > 0 && monthlySavings > 0) {
        const remaining = Math.max(0, context.savingsGoal - context.currentBalance);
        const monthsToGoal = Math.ceil(remaining / monthlySavings);
        goalAnalysis = `\n\nЦель накоплений: ${context.savingsGoal.toLocaleString('ru-RU')} ₽\nОстаток до цели: ${remaining.toLocaleString('ru-RU')} ₽\nДо цели: ${monthsToGoal} месяцев`;
      }

      const prompt = `Ты финансовый консультант для студентов. Проанализируй финансовую ситуацию пользователя и дай краткие практические рекомендации (максимум 4-5 предложений).

Данные пользователя:
- Текущий баланс: ${context.currentBalance.toLocaleString('ru-RU')} ₽
- Месячный доход: ${context.monthlyIncome.toLocaleString('ru-RU')} ₽
- Месячные расходы: ${context.monthlyExpenses.toLocaleString('ru-RU')} ₽
- Ежемесячная экономия: ${monthlySavings.toLocaleString('ru-RU')} ₽ (${savingsRate}% от дохода)${goalAnalysis}
${context.notes ? `\nЗаметки: ${context.notes}` : ''}

Дай конкретные советы по:
1. Оптимизации расходов (если экономия < 20% от дохода)
2. Достижению финансовых целей
3. Формированию финансовой подушки безопасности

Будь кратким, понятным и мотивирующим. Пиши как друг, а не как банкир.`;

      logger?.info("🤖 [analyzeBudgetTool] Generating AI analysis");

      const { text } = await generateText({
        model: openai.responses("gpt-4o-mini"),
        prompt,
        maxTokens: 300,
      });

      logger?.info("✅ [analyzeBudgetTool] Analysis generated", {
        length: text.length,
      });

      return {
        success: true,
        analysis: text,
      };
    } catch (error: any) {
      logger?.error("❌ [analyzeBudgetTool] Error", { error });
      return {
        success: false,
        analysis: "",
        error: error.message,
      };
    }
  },
});

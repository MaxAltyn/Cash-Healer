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
  description: "Analyze user's financial model with detailed expense breakdown and provide personalized recommendations for achieving goals",
  inputSchema: z.object({
    currentBalance: z.number().describe("Current balance in rubles"),
    nextIncome: z.number().describe("Next expected income in rubles"),
    daysUntilIncome: z.number().describe("Days until next income"),
    totalExpenses: z.number().describe("Total planned expenses in rubles"),
    afterExpenses: z.number().describe("Balance after expenses in rubles"),
    dailyBudget: z.number().describe("Daily budget available in rubles"),
    expenses: z.string().optional().describe("List of expense categories with amounts"),
    wishes: z.string().optional().describe("List of desired purchases with prices"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.string(),
    error: z.string().optional(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🤖 [analyzeBudgetTool] Analyzing budget", {
      currentBalance: context.currentBalance,
      totalExpenses: context.totalExpenses,
      daysUntilIncome: context.daysUntilIncome,
    });

    try {
      const prompt = `Ты финансовый консультант для студентов. Проанализируй детальную финансовую ситуацию пользователя и дай персонализированные рекомендации.

Текущая ситуация:
- Текущий баланс: ${context.currentBalance.toLocaleString('ru-RU')} ₽
- Дней до следующего дохода: ${context.daysUntilIncome}
- Следующий доход: ${context.nextIncome.toLocaleString('ru-RU')} ₽
- Всего запланированных расходов: ${context.totalExpenses.toLocaleString('ru-RU')} ₽
- Остаток после расходов: ${context.afterExpenses.toLocaleString('ru-RU')} ₽
- Средний дневной бюджет: ${context.dailyBudget.toLocaleString('ru-RU')} ₽${context.expenses ? `\n\nКатегории расходов: ${context.expenses}` : ''}${context.wishes ? `\n\nЖелаемые покупки: ${context.wishes}` : ''}

ОБЯЗАТЕЛЬНО проанализируй желания (если есть):
1. **Возможные комбинации в этом месяце**: Какие желания можно купить ВМЕСТЕ на остаток после расходов? Покажи ВСЕ реалистичные комбинации (например: "Можешь купить желание 1 + желание 3 = сумма", "Или желание 2 + желание 4 = сумма").

2. **Долгосрочный план**: Если не хватает денег на все желания сейчас, составь план на несколько месяцев:
   - Что купить в этом месяце
   - Сколько отложить для следующих месяцев
   - Конкретный график покупок (например: "Месяц 1: купи X, отложи Y₽. Месяц 2: купи Z из накоплений + Y₽")

3. **Приоритизация**: Если общая сумма желаний превышает остаток, предложи порядок покупок от самых важных/доступных.

Дополнительно:
- Реалистичность планов (хватит ли денег до зарплаты)
- На чем можно сэкономить для достижения желаний
- Формирование подушки безопасности${context.afterExpenses < 0 ? '\n- КРИТИЧНО: Как сократить расходы чтобы не уйти в минус' : ''}

Будь конкретным, с цифрами и примерами. Пиши как друг, а не как банкир. Используй эмодзи для наглядности (💰 🎯 ⚠️ ✅).`;

      logger?.info("🤖 [analyzeBudgetTool] Generating AI analysis");

      const { text } = await generateText({
        model: openai.responses("gpt-4o-mini"),
        prompt,
        maxTokens: 800,
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

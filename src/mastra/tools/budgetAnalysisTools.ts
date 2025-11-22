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
      const prompt = `Ты финансовый консультант для студентов. Проанализируй финансовую ситуацию и дай персонализированные рекомендации.

Текущая ситуация:
- Текущий баланс: ${context.currentBalance.toLocaleString('ru-RU')} ₽
- Дней до следующего дохода: ${context.daysUntilIncome}
- Следующий доход: ${context.nextIncome.toLocaleString('ru-RU')} ₽
- Всего запланированных расходов: ${context.totalExpenses.toLocaleString('ru-RU')} ₽
- Остаток после расходов: ${context.afterExpenses.toLocaleString('ru-RU')} ₽
- Средний дневной бюджет: ${context.dailyBudget.toLocaleString('ru-RU')} ₽${context.expenses ? `\n\nКатегории расходов: ${context.expenses}` : ''}${context.wishes ? `\n\nЖелаемые покупки (с приоритетами): ${context.wishes}` : ''}

ОБЯЗАТЕЛЬНО проанализируй желания (если есть):

**Долгосрочный план реализации желаний**:
- Цель: МАКСИМАЛЬНО БЫСТРО реализовать желания, учитывая приоритеты
- Если можно купить что-то сейчас - предложи это
- Для недоступных желаний: рассчитай сколько месяцев нужно копить
- ВАЖНО: каждое желание покупается ОДИН РАЗ, не повторяй покупки каждый месяц
- Покажи конкретный план: "Сейчас купи X и Y, через 2 месяца накопишь на Z (отложив по N₽/мес)"
- Учитывай приоритеты: 🔴 Высокий > 🟡 Средний > 🟢 Низкий

**Конкретные советы**:
- Проверь реалистичность плана (хватит ли денег до зарплаты?)
- Если нужно, предложи 2-3 конкретных способа сэкономить (например: "Готовь дома вместо кафе - экономия ~3000₽/мес")
- Подушка безопасности: предложи конкретную сумму и где её взять${context.afterExpenses < 0 ? '\n- ⚠️ КРИТИЧНО: Ты в минусе! Какие расходы сократить СЕЙЧАС?' : ''}

Требования к формату:
- Используй markdown для структуры: ### для заголовков, ** для важного текста, - для списков
- Пиши конкретно, с цифрами и примерами
- Стиль: дружеский, но профессиональный
- Используй эмодзи для наглядности (💰 🎯 ⚠️ ✅ 📊)
- ЗАВЕРШАЙ все мысли, не обрывай текст на полуслове`;


      logger?.info("🤖 [analyzeBudgetTool] Generating AI analysis");

      const { text } = await generateText({
        model: openai.responses("gpt-4o-mini"),
        prompt,
        maxTokens: 1000,
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

// src/mastra/tools/budgetAnalysisTools.ts
import { Tool } from "@mastra/core/tool";

export const analyzeBudgetTool = Tool({
  name: "analyze_budget",
  description: "Анализирует финансовую ситуацию пользователя и дает рекомендации",
  inputSchema: {
    type: "object",
    properties: {
      context: {
        type: "object",
        properties: {
          currentBalance: { type: "number" },
          nextIncome: { type: "number" },
          daysUntilIncome: { type: "number" },
          totalExpenses: { type: "number" },
          afterExpenses: { type: "number" },
          dailyBudget: { type: "number" },
          expenses: { type: "string" },
          wishes: { type: "string" }
        }
      }
    }
  },
  
  execute: async ({ context }) => {
    // Простой статический анализ без AI
    const analysis = `## 📊 Базовый анализ бюджета

**Текущий баланс:** ${context.currentBalance.toLocaleString('ru-RU')} ₽
**До следующего дохода:** ${context.daysUntilIncome} дней
**Ежедневный бюджет:** ${context.dailyBudget.toLocaleString('ru-RU')} ₽/день

### 💡 Основные выводы:
${context.dailyBudget > 5000 ? '✅ Отличный дневной бюджет!' : context.dailyBudget > 2000 ? '📊 Хороший дневной бюджет' : '💡 Есть куда расти'}

### 🎯 Рекомендации:
1. **Отложите 10%** от остатка на непредвиденные расходы
2. **Приоритетные расходы:** оплата ЖКХ, кредиты, продукты
3. **Отложите покупки** с низким приоритетом
4. **Используйте ежедневный лимит** ${context.dailyBudget.toFixed(0)} ₽

*Для более детального AI-анализа настройте API ключ в настройках.*`;
    
    return {
      success: true,
      analysis: analysis
    };
  }
});

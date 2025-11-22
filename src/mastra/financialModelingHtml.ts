export const financialModelingHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Финансовое моделирование</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--tg-theme-bg-color, #ffffff);
            color: var(--tg-theme-text-color, #000000);
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { font-size: 24px; margin-bottom: 8px; color: var(--tg-theme-text-color); }
        .subtitle { font-size: 14px; color: var(--tg-theme-hint-color, #999); margin-bottom: 24px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--tg-theme-text-color); }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--tg-theme-hint-color, #ddd);
            border-radius: 8px;
            font-size: 16px;
            background: var(--tg-theme-bg-color, #fff);
            color: var(--tg-theme-text-color, #000);
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus { outline: none; border-color: var(--tg-theme-button-color, #0088cc); }
        textarea { min-height: 80px; resize: vertical; }
        .input-hint { font-size: 12px; color: var(--tg-theme-hint-color, #999); margin-top: 4px; }
        .summary {
            background: var(--tg-theme-secondary-bg-color, #f0f0f0);
            border-radius: 12px;
            padding: 16px;
            margin-top: 24px;
        }
        .summary-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--tg-theme-text-color); }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .summary-item.total {
            border-top: 2px solid var(--tg-theme-hint-color, #ddd);
            margin-top: 8px;
            padding-top: 12px;
            font-weight: 600;
            font-size: 16px;
        }
        .summary-value { font-weight: 500; }
        .summary-value.positive { color: #4CAF50; }
        .summary-value.negative { color: #F44336; }
        .ai-analysis {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            padding: 16px;
            margin-top: 16px;
        }
        .ai-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; opacity: 0.9; }
        .ai-content { font-size: 14px; line-height: 1.5; }
        .loader { text-align: center; padding: 20px; }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 Финансовое моделирование</h1>
        <p class="subtitle">Введите ваши финансовые данные для анализа</p>
        
        <form id="financialForm">
            <div class="form-group">
                <label for="balance">Текущий баланс (₽)</label>
                <input type="number" id="balance" placeholder="50000" required>
                <div class="input-hint">Сколько денег у вас сейчас есть</div>
            </div>
            
            <div class="form-group">
                <label for="income">Месячный доход (₽)</label>
                <input type="number" id="income" placeholder="80000" required>
                <div class="input-hint">Сколько вы зарабатываете в месяц</div>
            </div>
            
            <div class="form-group">
                <label for="expenses">Месячные расходы (₽)</label>
                <input type="number" id="expenses" placeholder="60000" required>
                <div class="input-hint">Сколько вы тратите в месяц</div>
            </div>
            
            <div class="form-group">
                <label for="goal">Цель накоплений (₽, необязательно)</label>
                <input type="number" id="goal" placeholder="500000">
                <div class="input-hint">Сколько хотите накопить</div>
            </div>
            
            <div class="form-group">
                <label for="notes">Дополнительные заметки (необязательно)</label>
                <textarea id="notes" placeholder="Например: планирую покупку авто через год"></textarea>
            </div>
        </form>
        
        <div class="summary" id="summary" style="display: none;">
            <div class="summary-title">📊 Ваша финансовая модель</div>
            <div class="summary-item">
                <span>Текущий баланс:</span>
                <span class="summary-value" id="summaryBalance">0 ₽</span>
            </div>
            <div class="summary-item">
                <span>Доход в месяц:</span>
                <span class="summary-value positive" id="summaryIncome">0 ₽</span>
            </div>
            <div class="summary-item">
                <span>Расходы в месяц:</span>
                <span class="summary-value negative" id="summaryExpenses">0 ₽</span>
            </div>
            <div class="summary-item total">
                <span>Ежемесячная экономия:</span>
                <span class="summary-value" id="summarySavings">0 ₽</span>
            </div>
            <div class="summary-item" id="goalSection" style="display: none;">
                <span>До цели:</span>
                <span class="summary-value" id="summaryGoalTime">0 мес</span>
            </div>
        </div>
        
        <div class="ai-analysis" id="aiAnalysis" style="display: none;">
            <div class="ai-title">🤖 AI Анализ</div>
            <div class="loader" id="aiLoader">
                <div class="spinner"></div>
            </div>
            <div class="ai-content" id="aiContent" style="display: none;"></div>
        </div>
    </div>
    
    <script>
        function initApp() {
            if (!window.Telegram || !window.Telegram.WebApp) {
                console.error('Telegram Web App SDK not loaded');
                document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Ошибка загрузки. Откройте через Telegram.</div>';
                return;
            }
            
            const tg = window.Telegram.WebApp;
            tg.expand();
            tg.MainButton.setText('Сохранить и получить анализ');
            tg.MainButton.show();
            
            const form = document.getElementById('financialForm');
            const summary = document.getElementById('summary');
            const aiAnalysis = document.getElementById('aiAnalysis');
            const aiLoader = document.getElementById('aiLoader');
            const aiContent = document.getElementById('aiContent');
            
            function updateSummary() {
                const balance = parseInt(document.getElementById('balance').value) || 0;
                const income = parseInt(document.getElementById('income').value) || 0;
                const expenses = parseInt(document.getElementById('expenses').value) || 0;
                const goal = parseInt(document.getElementById('goal').value) || 0;
                
                if (balance || income || expenses) {
                    summary.style.display = 'block';
                    
                    document.getElementById('summaryBalance').textContent = balance.toLocaleString('ru-RU') + ' ₽';
                    document.getElementById('summaryIncome').textContent = income.toLocaleString('ru-RU') + ' ₽';
                    document.getElementById('summaryExpenses').textContent = expenses.toLocaleString('ru-RU') + ' ₽';
                    
                    const savings = income - expenses;
                    const savingsEl = document.getElementById('summarySavings');
                    savingsEl.textContent = savings.toLocaleString('ru-RU') + ' ₽';
                    savingsEl.className = 'summary-value ' + (savings > 0 ? 'positive' : savings < 0 ? 'negative' : '');
                    
                    if (goal > 0 && savings > 0) {
                        const goalSection = document.getElementById('goalSection');
                        const remaining = Math.max(0, goal - balance);
                        const months = Math.ceil(remaining / savings);
                        goalSection.style.display = 'block';
                        document.getElementById('summaryGoalTime').textContent = months + ' мес';
                    }
                }
            }
            
            form.addEventListener('input', updateSummary);
            
            tg.MainButton.onClick(async () => {
                const balance = parseInt(document.getElementById('balance').value) || 0;
                const income = parseInt(document.getElementById('income').value) || 0;
                const expenses = parseInt(document.getElementById('expenses').value) || 0;
                const goal = parseInt(document.getElementById('goal').value) || 0;
                const notes = document.getElementById('notes').value;
                
                if (!balance && !income && !expenses) {
                    tg.showAlert('Пожалуйста, заполните хотя бы одно поле');
                    return;
                }
                
                tg.MainButton.showProgress();
                
                aiAnalysis.style.display = 'block';
                aiLoader.style.display = 'block';
                aiContent.style.display = 'none';
                
                try {
                    const response = await fetch('/api/financial-modeling/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            initData: tg.initData,
                            balance,
                            income,
                            expenses,
                            goal,
                            notes
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        aiLoader.style.display = 'none';
                        aiContent.style.display = 'block';
                        aiContent.textContent = result.analysis;
                        
                        tg.MainButton.hideProgress();
                        tg.showAlert('✅ Данные сохранены! Вы можете вернуться в любой момент для обновления.');
                    } else {
                        throw new Error(result.error || 'Ошибка сохранения');
                    }
                } catch (error) {
                    tg.MainButton.hideProgress();
                    tg.showAlert('Ошибка: ' + error.message);
                    aiAnalysis.style.display = 'none';
                }
            });
            
            updateSummary();
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
    </script>
</body>
</html>`;

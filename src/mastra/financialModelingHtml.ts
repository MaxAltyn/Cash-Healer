export const financialModelingHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Финансовое моделирование</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 16px;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        h1 { 
            font-size: 28px; 
            margin-bottom: 8px; 
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .subtitle { 
            font-size: 14px; 
            color: #666; 
            margin-bottom: 24px; 
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .form-group { 
            margin-bottom: 16px; 
        }
        label { 
            display: block; 
            font-size: 14px; 
            font-weight: 500; 
            margin-bottom: 6px; 
            color: #333; 
        }
        input[type="number"], input[type="date"], input[type="text"], textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus { 
            outline: none; 
            border-color: #667eea; 
        }
        textarea { 
            min-height: 80px; 
            resize: vertical; 
            font-family: inherit;
        }
        .input-hint { 
            font-size: 12px; 
            color: #999; 
            margin-top: 4px; 
        }
        
        .expense-category, .wish-item {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }
        .expense-category input, .wish-item input, .wish-item select {
            flex: 1;
            min-width: 0;
        }
        .expense-category input[type="number"], .wish-item input[type="number"] {
            flex: 0 0 90px;
        }
        .wish-item select {
            flex: 0 0 100px;
            padding: 10px 6px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            cursor: pointer;
        }
        
        @media (max-width: 480px) {
            .expense-category, .wish-item {
                padding: 8px;
                gap: 6px;
            }
            .expense-category input[type="number"], .wish-item input[type="number"] {
                flex: 0 0 70px;
            }
            .wish-item select {
                flex: 0 0 85px;
                padding: 8px 4px;
                font-size: 12px;
            }
            .btn-remove {
                padding: 6px 8px;
                font-size: 12px;
            }
            input[type="number"], input[type="date"], input[type="text"], textarea {
                padding: 10px;
                font-size: 15px;
            }
        }
        .btn-remove {
            background: #f44336;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .btn-add {
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            margin-top: 8px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-top: 16px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .results {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            padding: 20px;
        }
        .result-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .result-item:last-child {
            border-bottom: none;
        }
        .result-label {
            font-size: 14px;
            opacity: 0.9;
        }
        .result-value {
            font-size: 18px;
            font-weight: 600;
        }
        .result-value.big {
            font-size: 24px;
        }
        .result-value.positive { color: #4CAF50; }
        .result-value.negative { color: #ff5252; }
        .result-value.neutral { color: #FFA726; }
        
        .daily-breakdown {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-top: 16px;
        }
        .progress-bar {
            height: 24px;
            background: #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            margin: 12px 0;
            position: relative;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
            transition: width 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
        }
        .progress-fill.danger {
            background: linear-gradient(90deg, #f44336 0%, #ff5252 100%);
        }
        .progress-fill.warning {
            background: linear-gradient(90deg, #FFA726 0%, #FFB74D 100%);
        }
        
        .recommendation {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
            color: #856404;
        }
        .recommendation.success {
            background: #d4edda;
            border-color: #28a745;
            color: #155724;
        }
        .recommendation.danger {
            background: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        
        .ai-analysis {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-top: 16px;
        }
        .loader {
            text-align: center;
            padding: 20px;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .hidden { display: none; }
        
        .wish-status {
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
        }
        .wish-status.can-afford { color: #4CAF50; }
        .wish-status.cannot-afford { color: #f44336; }
        .wish-status.need-save { color: #FFA726; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>💰 Финансовое моделирование</h1>
            <p class="subtitle">Создайте интерактивную модель и экспериментируйте со сценариями</p>
            
            <!-- Базовые данные -->
            <div class="section-title">📊 Текущая ситуация</div>
            
            <div class="form-group">
                <label for="currentBalance">Текущий баланс (₽)</label>
                <input type="number" id="currentBalance" placeholder="30000" value="30000">
                <div class="input-hint">Сколько денег у вас сейчас</div>
            </div>
            
            <div class="form-group">
                <label for="nextIncome">Следующий доход (₽)</label>
                <input type="number" id="nextIncome" placeholder="60000" value="60000">
                <div class="input-hint">Размер следующей зарплаты/дохода</div>
            </div>
            
            <div class="form-group">
                <label for="nextIncomeDate">Дата следующего дохода</label>
                <input type="date" id="nextIncomeDate">
                <div class="input-hint">Когда придет следующая зарплата</div>
            </div>
            
            <!-- Необходимые расходы -->
            <div class="section-title">🏠 Необходимые расходы</div>
            <div id="expensesContainer">
                <div class="expense-category">
                    <input type="text" placeholder="Категория (например, Еда)" value="Еда">
                    <input type="number" placeholder="Сумма" value="15000">
                    <button class="btn-remove" onclick="removeExpense(this)">✕</button>
                </div>
                <div class="expense-category">
                    <input type="text" placeholder="Категория (например, Транспорт)" value="Транспорт">
                    <input type="number" placeholder="Сумма" value="5000">
                    <button class="btn-remove" onclick="removeExpense(this)">✕</button>
                </div>
            </div>
            <button class="btn-add" onclick="addExpense()">+ Добавить расход</button>
            
            <!-- Хотелки -->
            <div class="section-title" style="margin-top: 24px;">✨ Желаемые покупки</div>
            <div id="wishesContainer">
                <div class="wish-item">
                    <input type="text" placeholder="Что хотите купить" value="Новый телефон">
                    <input type="number" placeholder="Цена" value="40000">
                    <select class="wish-priority">
                        <option value="high">🔴 Высокий</option>
                        <option value="medium" selected>🟡 Средний</option>
                        <option value="low">🟢 Низкий</option>
                    </select>
                    <button class="btn-remove" onclick="removeWish(this)">✕</button>
                </div>
            </div>
            <button class="btn-add" onclick="addWish()">+ Добавить желание</button>
            
            <button class="btn-primary" onclick="calculate()">🔮 Рассчитать модель</button>
        </div>
        
        <!-- Результаты -->
        <div id="resultsCard" class="card hidden">
            <div class="results">
                <div class="result-item">
                    <span class="result-label">💰 Текущий баланс</span>
                    <span class="result-value big" id="displayBalance">0 ₽</span>
                </div>
                <div class="result-item">
                    <span class="result-label">📅 Дней до зарплаты</span>
                    <span class="result-value" id="daysUntilIncome">0</span>
                </div>
                <div class="result-item">
                    <span class="result-label">💸 Всего расходов</span>
                    <span class="result-value negative" id="totalExpenses">0 ₽</span>
                </div>
                <div class="result-item">
                    <span class="result-label">📊 Остаток после расходов</span>
                    <span class="result-value" id="afterExpenses">0 ₽</span>
                </div>
                <div class="result-item">
                    <span class="result-label">💵 Средний расход в день</span>
                    <span class="result-value" id="dailyBurn">0 ₽</span>
                </div>
            </div>
            
            <div class="daily-breakdown">
                <div class="section-title">📈 Прогноз по дням</div>
                <div id="dailyProgress"></div>
            </div>
            
            <div id="wishesResults"></div>
            
            <div id="recommendations"></div>
            
            <div id="wishCombinations"></div>
            
            <button class="btn-primary" onclick="saveAndAnalyze()">
                💾 Сохранить и получить AI рекомендации
            </button>
        </div>
        
        <!-- AI Анализ -->
        <div id="aiCard" class="card hidden">
            <div class="ai-analysis">
                <div class="section-title">🤖 AI Рекомендации</div>
                <div class="loader" id="aiLoader">
                    <div class="spinner"></div>
                    <p style="margin-top: 12px; color: #666;">Анализирую вашу ситуацию...</p>
                </div>
                <div id="aiContent" class="hidden" style="line-height: 1.6; color: #333;"></div>
            </div>
        </div>
    </div>
    
    <script src="/financial-modeling.js"></script>
</body>
</html>`;

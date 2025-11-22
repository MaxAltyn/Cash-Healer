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
            <div id="debugStatus" style="background: #ffe082; padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; border: 2px solid #ff9800;">
                <strong>🔧 ТЕСТ:</strong> <span id="debugText">Если видите этот текст - HTML загрузился!</span>
                <button onclick="alert('JavaScript работает!')" style="margin-left: 8px; padding: 4px 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Тест JS</button>
            </div>
            
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
                    <button class="btn-remove">✕</button>
                </div>
                <div class="expense-category">
                    <input type="text" placeholder="Категория (например, Транспорт)" value="Транспорт">
                    <input type="number" placeholder="Сумма" value="5000">
                    <button class="btn-remove">✕</button>
                </div>
            </div>
            <button class="btn-add" id="addExpenseBtn">+ Добавить расход</button>
            
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
                    <button class="btn-remove">✕</button>
                </div>
            </div>
            <button class="btn-add" id="addWishBtn">+ Добавить желание</button>
            
            <button class="btn-primary" id="calculateBtn">🔮 Рассчитать модель</button>
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
            
            <button class="btn-primary" id="saveBtn">
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
    
    <script>
        // Установка даты по умолчанию (через 15 дней)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 15);
        document.getElementById('nextIncomeDate').value = defaultDate.toISOString().split('T')[0];
        
        function addExpense() {
            const container = document.getElementById('expensesContainer');
            const div = document.createElement('div');
            div.className = 'expense-category';
            div.innerHTML = \`
                <input type="text" placeholder="Категория">
                <input type="number" placeholder="Сумма">
                <button class="btn-remove">✕</button>
            \`;
            const removeBtn = div.querySelector('.btn-remove');
            removeBtn.addEventListener('click', function() {
                removeExpense(this);
            });
            container.appendChild(div);
        }
        
        function removeExpense(btn) {
            const container = document.getElementById('expensesContainer');
            if (container.children.length > 1) {
                btn.parentElement.remove();
            }
        }
        
        function addWish() {
            const container = document.getElementById('wishesContainer');
            const div = document.createElement('div');
            div.className = 'wish-item';
            div.innerHTML = \`
                <input type="text" placeholder="Что хотите купить">
                <input type="number" placeholder="Цена">
                <select class="wish-priority">
                    <option value="high">🔴 Высокий</option>
                    <option value="medium" selected>🟡 Средний</option>
                    <option value="low">🟢 Низкий</option>
                </select>
                <button class="btn-remove">✕</button>
            \`;
            const removeBtn = div.querySelector('.btn-remove');
            removeBtn.addEventListener('click', function() {
                removeWish(this);
            });
            container.appendChild(div);
        }
        
        function removeWish(btn) {
            btn.parentElement.remove();
        }
        
        function getExpenses() {
            const expenses = [];
            document.querySelectorAll('#expensesContainer .expense-category').forEach(el => {
                const name = el.children[0].value;
                const amount = parseFloat(el.children[1].value) || 0;
                if (name && amount > 0) {
                    expenses.push({ name, amount });
                }
            });
            return expenses;
        }
        
        function getWishes() {
            const wishes = [];
            document.querySelectorAll('#wishesContainer .wish-item').forEach(el => {
                const name = el.children[0].value;
                const price = parseFloat(el.children[1].value) || 0;
                const priority = el.children[2].value;
                if (name && price > 0) {
                    wishes.push({ name, price, priority });
                }
            });
            return wishes;
        }
        
        function calculate() {
            const currentBalance = parseFloat(document.getElementById('currentBalance').value) || 0;
            const nextIncome = parseFloat(document.getElementById('nextIncome').value) || 0;
            const nextIncomeDate = new Date(document.getElementById('nextIncomeDate').value);
            
            const expenses = getExpenses();
            const wishes = getWishes();
            
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
            const afterExpenses = currentBalance - totalExpenses;
            
            const today = new Date();
            const daysUntilIncome = Math.max(1, Math.ceil((nextIncomeDate - today) / (1000 * 60 * 60 * 24)));
            const dailyBurn = totalExpenses / daysUntilIncome;
            
            // Обновление результатов
            document.getElementById('displayBalance').textContent = currentBalance.toLocaleString('ru-RU') + ' ₽';
            document.getElementById('daysUntilIncome').textContent = daysUntilIncome + ' дней';
            document.getElementById('totalExpenses').textContent = totalExpenses.toLocaleString('ru-RU') + ' ₽';
            
            const afterExpensesEl = document.getElementById('afterExpenses');
            afterExpensesEl.textContent = afterExpenses.toLocaleString('ru-RU') + ' ₽';
            afterExpensesEl.className = 'result-value ' + (afterExpenses > 0 ? 'positive' : afterExpenses < 0 ? 'negative' : 'neutral');
            
            document.getElementById('dailyBurn').textContent = dailyBurn.toLocaleString('ru-RU') + ' ₽/день';
            
            // Прогресс по дням
            const progressHtml = [];
            let remainingBalance = currentBalance;
            
            for (let day = 0; day <= daysUntilIncome && day < 30; day++) {
                const dayExpense = dailyBurn;
                remainingBalance -= dayExpense;
                const percentage = Math.max(0, Math.min(100, (remainingBalance / currentBalance) * 100));
                const status = remainingBalance > 0 ? (percentage > 30 ? '' : 'warning') : 'danger';
                
                if (day % 5 === 0 || day === daysUntilIncome - 1) {
                    progressHtml.push(\`
                        <div style="margin: 8px 0;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                <span>День \${day + 1}</span>
                                <span>\${remainingBalance.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill \${status}" style="width: \${percentage}%">
                                    \${percentage > 20 ? percentage.toFixed(0) + '%' : ''}
                                </div>
                            </div>
                        </div>
                    \`);
                }
            }
            
            document.getElementById('dailyProgress').innerHTML = progressHtml.join('');
            
            // Анализ хотелок
            const wishesHtml = wishes.map(wish => {
                let status = '', statusClass = '', message = '';
                if (afterExpenses >= wish.price) {
                    status = '✅ Можете позволить сейчас!';
                    statusClass = 'can-afford';
                    message = \`У вас останется \${(afterExpenses - wish.price).toLocaleString('ru-RU')} ₽ после покупки.\`;
                } else if (currentBalance >= wish.price) {
                    status = '⚠️ Хватит, но придется экономить';
                    statusClass = 'need-save';
                    const deficit = wish.price - afterExpenses;
                    message = \`Нужно сэкономить \${deficit.toLocaleString('ru-RU')} ₽ на расходах.\`;
                } else {
                    status = '❌ Пока не хватает';
                    statusClass = 'cannot-afford';
                    const deficit = wish.price - currentBalance;
                    const monthsToSave = Math.ceil(deficit / Math.max(1, nextIncome - totalExpenses));
                    message = \`Не хватает \${deficit.toLocaleString('ru-RU')} ₽. Накопите за ~\${monthsToSave} мес.\`;
                }
                
                return \`
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 8px 0;">
                        <div style="font-weight: 600; margin-bottom: 4px;">\${wish.name} — \${wish.price.toLocaleString('ru-RU')} ₽</div>
                        <div class="wish-status \${statusClass}">\${status}</div>
                        <div style="font-size: 13px; color: #666; margin-top: 4px;">\${message}</div>
                    </div>
                \`;
            }).join('');
            
            if (wishesHtml) {
                document.getElementById('wishesResults').innerHTML = \`
                    <div class="daily-breakdown">
                        <div class="section-title">✨ Анализ желаний</div>
                        \${wishesHtml}
                    </div>
                \`;
            }
            
            // Рекомендации
            let recommendationHtml = '';
            if (afterExpenses < 0) {
                recommendationHtml = \`
                    <div class="recommendation danger">
                        <strong>⚠️ Внимание!</strong> Ваших денег не хватит на все расходы. 
                        Нужно сократить расходы на \${Math.abs(afterExpenses).toLocaleString('ru-RU')} ₽ 
                        или найти дополнительный доход.
                    </div>
                \`;
            } else if (afterExpenses < currentBalance * 0.2) {
                recommendationHtml = \`
                    <div class="recommendation">
                        <strong>💡 Совет:</strong> Остается мало средств (\${afterExpenses.toLocaleString('ru-RU')} ₽). 
                        Попробуйте сэкономить на некритичных категориях расходов.
                    </div>
                \`;
            } else {
                recommendationHtml = \`
                    <div class="recommendation success">
                        <strong>✅ Отлично!</strong> У вас останется \${afterExpenses.toLocaleString('ru-RU')} ₽ после всех расходов. 
                        Это \${((afterExpenses/currentBalance)*100).toFixed(0)}% от текущего баланса.
                    </div>
                \`;
            }
            
            document.getElementById('recommendations').innerHTML = recommendationHtml;
            
            // Рассчитать возможные комбинации желаний
            calculateWishCombinations(afterExpenses);
            
            document.getElementById('resultsCard').classList.remove('hidden');
        }
        
        function calculateWishCombinations(afterExpenses) {
            const wishes = getWishes();
            if (wishes.length === 0) {
                document.getElementById('wishCombinations').innerHTML = '';
                return;
            }
            
            // Группируем желания по приоритету
            const highPriority = wishes.filter(w => w.priority === 'high');
            const mediumPriority = wishes.filter(w => w.priority === 'medium');
            const lowPriority = wishes.filter(w => w.priority === 'low');
            
            const combinations = [];
            
            // Находим все возможные комбинации
            function findCombinations(items, budget, current = [], startIdx = 0) {
                const currentTotal = current.reduce((sum, item) => sum + item.price, 0);
                if (currentTotal <= budget && current.length > 0) {
                    combinations.push([...current]);
                }
                
                for (let i = startIdx; i < items.length; i++) {
                    if (currentTotal + items[i].price <= budget) {
                        findCombinations(items, budget, [...current, items[i]], i + 1);
                    }
                }
            }
            
            findCombinations(wishes, afterExpenses);
            
            // Дедупликация комбинаций
            const uniqueCombinations = [];
            const seen = new Set();
            
            combinations.forEach(combo => {
                const key = combo.map(w => w.name).sort().join('|');
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCombinations.push(combo);
                }
            });
            
            // Сортируем комбинации: больше желаний + выше приоритет + больше остаток = лучше
            uniqueCombinations.sort((a, b) => {
                const totalA = a.reduce((sum, w) => sum + w.price, 0);
                const totalB = b.reduce((sum, w) => sum + w.price, 0);
                const scoreA = a.length * 10 + a.filter(w => w.priority === 'high').length * 5 + a.filter(w => w.priority === 'medium').length * 2 + (afterExpenses - totalA) * 0.01;
                const scoreB = b.length * 10 + b.filter(w => w.priority === 'high').length * 5 + b.filter(w => w.priority === 'medium').length * 2 + (afterExpenses - totalB) * 0.01;
                return scoreB - scoreA;
            });
            
            const dedupedCombinations = uniqueCombinations;
            
            let html = '<div style="margin-top: 20px; padding: 16px; background: #f9f9f9; border-radius: 8px;">';
            html += '<div class="section-title">✨ Возможные комбинации желаний</div>';
            
            if (dedupedCombinations.length === 0) {
                html += '<p style="color: #666; margin-top: 8px;">К сожалению, на остаток после расходов не хватает ни на одно желание. Попробуйте сократить расходы или дождитесь следующего дохода.</p>';
            } else {
                const topCombinations = dedupedCombinations.slice(0, 5); // Показываем топ-5
                topCombinations.forEach((combo, idx) => {
                    const total = combo.reduce((sum, w) => sum + w.price, 0);
                    const priorityEmoji = combo.some(w => w.priority === 'high') ? '🔴' : combo.some(w => w.priority === 'medium') ? '🟡' : '🟢';
                    const borderColor = combo.some(w => w.priority === 'high') ? '#f44336' : combo.some(w => w.priority === 'medium') ? '#ff9800' : '#4CAF50';
                    const wishesText = combo.map(w => {
                        const emoji = w.priority === 'high' ? '🔴' : w.priority === 'medium' ? '🟡' : '🟢';
                        return emoji + ' ' + w.name + ' (' + w.price.toLocaleString('ru-RU') + ' ₽)';
                    }).join(' + ');
                    html += \`
                        <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid \${borderColor};">
                            <div style="font-weight: 600; margin-bottom: 4px;">\${priorityEmoji} Вариант \${idx + 1}</div>
                            <div style="color: #666; font-size: 14px;">
                                \${wishesText}
                            </div>
                            <div style="margin-top: 4px; font-weight: 500; color: #667eea;">
                                Итого: \${total.toLocaleString('ru-RU')} ₽ <span style="color: #4CAF50;">(останется \${(afterExpenses - total).toLocaleString('ru-RU')} ₽)</span>
                            </div>
                        </div>
                    \`;
                });
                
                if (dedupedCombinations.length > 5) {
                    html += \`<p style="color: #999; font-size: 13px; margin-top: 8px;">И ещё \${dedupedCombinations.length - 5} возможных комбинаций...</p>\`;
                }
            }
            
            html += '</div>';
            document.getElementById('wishCombinations').innerHTML = html;
        }
        
        function convertMarkdownToHtml(text) {
            // Конвертируем markdown в HTML
            let html = text;
            
            // ### заголовки
            html = html.replace(/### (.+)/g, '|||H3|||$1|||/H3|||');
            
            // ** жирный текст **
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            
            // Обработка списков и параграфов
            const lines = html.split('\\n');
            let inList = false;
            let result = [];
            let paragraphBuffer = [];
            
            const flushParagraph = () => {
                if (paragraphBuffer.length > 0) {
                    const text = paragraphBuffer.join(' ').trim();
                    if (text) {
                        result.push('<p style="margin: 8px 0;">' + text + '</p>');
                    }
                    paragraphBuffer = [];
                }
            };
            
            lines.forEach(line => {
                const trimmed = line.trim();
                
                if (trimmed.startsWith('|||H3|||')) {
                    // Заголовок
                    flushParagraph();
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                    }
                    result.push(trimmed);
                } else if (trimmed.startsWith('- ')) {
                    // Элемент списка
                    flushParagraph();
                    if (!inList) {
                        result.push('<ul style="margin: 8px 0; padding-left: 20px;">');
                        inList = true;
                    }
                    result.push('<li style="margin: 4px 0;">' + trimmed.substring(2) + '</li>');
                } else if (trimmed === '') {
                    // Пустая строка - завершить параграф
                    flushParagraph();
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                    }
                } else {
                    // Обычный текст - добавить в буфер параграфа
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                    }
                    paragraphBuffer.push(trimmed);
                }
            });
            
            // Закрыть открытые элементы
            flushParagraph();
            if (inList) {
                result.push('</ul>');
            }
            
            html = result.join('');
            
            // Восстановить заголовки
            html = html.replace(/\|\|\|H3\|\|\|(.+?)\|\|\|\/H3\|\|\|/g, '<h3 style="margin-top: 16px; margin-bottom: 8px; color: #333; font-size: 18px;">$1</h3>');
            
            return html;
        }
        
        async function saveAndAnalyze() {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Сохранение...';
            
            const currentBalance = parseFloat(document.getElementById('currentBalance').value) || 0;
            const nextIncome = parseFloat(document.getElementById('nextIncome').value) || 0;
            const nextIncomeDate = document.getElementById('nextIncomeDate').value;
            const expenses = getExpenses();
            const wishes = getWishes();
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
            
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const orderId = urlParams.get('orderId');
            
            document.getElementById('aiCard').classList.remove('hidden');
            document.getElementById('aiLoader').classList.remove('hidden');
            document.getElementById('aiContent').classList.add('hidden');
            
            try {
                const response = await fetch('/api/financial-modeling/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        orderId,
                        currentBalance,
                        nextIncome,
                        nextIncomeDate,
                        expenses,
                        wishes,
                        totalExpenses
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('aiLoader').classList.add('hidden');
                    document.getElementById('aiContent').classList.remove('hidden');
                    document.getElementById('aiContent').innerHTML = convertMarkdownToHtml(result.analysis);
                    saveBtn.textContent = '✅ Сохранено!';
                } else {
                    throw new Error(result.error || 'Ошибка сохранения');
                }
            } catch (error) {
                alert('Ошибка: ' + error.message);
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Сохранить и получить AI рекомендации';
                document.getElementById('aiCard').classList.add('hidden');
            }
        }
        
        // Автоматический пересчет при изменении
        document.getElementById('currentBalance').addEventListener('input', () => {
            if (!document.getElementById('resultsCard').classList.contains('hidden')) {
                calculate();
            }
        });
        document.getElementById('nextIncome').addEventListener('input', () => {
            if (!document.getElementById('resultsCard').classList.contains('hidden')) {
                calculate();
            }
        });
        document.getElementById('nextIncomeDate').addEventListener('change', () => {
            if (!document.getElementById('resultsCard').classList.contains('hidden')) {
                calculate();
            }
        });
        
        // Обновление при изменении полей
        setInterval(() => {
            if (!document.getElementById('resultsCard').classList.contains('hidden')) {
                calculate();
            }
        }, 2000);
        
        // Инициализация event listeners (сразу, без DOMContentLoaded, т.к. скрипт в конце страницы)
        (function initEventListeners() {
            console.log('🚀 Initializing event listeners...');
            
            // Показываем debug статус
            const debugStatus = document.getElementById('debugStatus');
            const debugText = document.getElementById('debugText');
            if (debugStatus && debugText) {
                debugStatus.style.display = 'block';
                debugText.textContent = 'JavaScript загружен, инициализация...';
            }
            
            try {
                // Кнопка "Добавить расход"
                const addExpenseBtn = document.getElementById('addExpenseBtn');
                if (addExpenseBtn) {
                    addExpenseBtn.addEventListener('click', function(e) {
                        console.log('✅ Add expense clicked!');
                        e.preventDefault();
                        addExpense();
                    });
                    console.log('✅ addExpenseBtn listener attached');
                } else {
                    console.error('❌ addExpenseBtn not found!');
                }
                
                // Кнопка "Добавить желание"
                const addWishBtn = document.getElementById('addWishBtn');
                if (addWishBtn) {
                    addWishBtn.addEventListener('click', function(e) {
                        console.log('✅ Add wish clicked!');
                        e.preventDefault();
                        addWish();
                    });
                    console.log('✅ addWishBtn listener attached');
                } else {
                    console.error('❌ addWishBtn not found!');
                }
                
                // Кнопка "Рассчитать модель"
                const calculateBtn = document.getElementById('calculateBtn');
                if (calculateBtn) {
                    calculateBtn.addEventListener('click', function(e) {
                        console.log('✅ Calculate clicked!');
                        e.preventDefault();
                        calculate();
                    });
                    console.log('✅ calculateBtn listener attached');
                } else {
                    console.error('❌ calculateBtn not found!');
                }
                
                // Кнопка "Сохранить и получить AI рекомендации"
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', function(e) {
                        console.log('✅ Save clicked!');
                        e.preventDefault();
                        saveAndAnalyze();
                    });
                    console.log('✅ saveBtn listener attached');
                } else {
                    console.error('❌ saveBtn not found!');
                }
                
                // Event listeners для существующих кнопок удаления расходов
                const expenseRemoveBtns = document.querySelectorAll('#expensesContainer .btn-remove');
                console.log('Found expense remove buttons:', expenseRemoveBtns.length);
                expenseRemoveBtns.forEach((btn, idx) => {
                    btn.addEventListener('click', function() {
                        console.log('Removing expense', idx);
                        removeExpense(this);
                    });
                });
                
                // Event listeners для существующих кнопок удаления желаний
                const wishRemoveBtns = document.querySelectorAll('#wishesContainer .btn-remove');
                console.log('Found wish remove buttons:', wishRemoveBtns.length);
                wishRemoveBtns.forEach((btn, idx) => {
                    btn.addEventListener('click', function() {
                        console.log('Removing wish', idx);
                        removeWish(this);
                    });
                });
                
                console.log('✅ All event listeners initialized successfully!');
                
                // Обновляем debug статус
                if (debugText) {
                    debugText.textContent = '✅ Все кнопки инициализированы успешно!';
                    debugText.style.color = '#2e7d32';
                }
            } catch (error) {
                console.error('❌ Error initializing event listeners:', error);
                if (debugText) {
                    debugText.textContent = '❌ Ошибка: ' + error.message;
                    debugText.style.color = '#c62828';
                }
            }
        })();
    </script>
</body>
</html>`;

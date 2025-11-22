// Установка даты по умолчанию (через 15 дней)
const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + 15);
document.getElementById('nextIncomeDate').value = defaultDate.toISOString().split('T')[0];

function addExpense() {
    const container = document.getElementById('expensesContainer');
    const div = document.createElement('div');
    div.className = 'expense-category';
    div.innerHTML = `
        <input type="text" placeholder="Категория">
        <input type="number" placeholder="Сумма">
        <button class="btn-remove" onclick="removeExpense(this)">✕</button>
    `;
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
    div.innerHTML = `
        <input type="text" placeholder="Что хотите купить">
        <input type="number" placeholder="Цена">
        <select class="wish-priority">
            <option value="high">🔴 Высокий</option>
            <option value="medium" selected>🟡 Средний</option>
            <option value="low">🟢 Низкий</option>
        </select>
        <button class="btn-remove" onclick="removeWish(this)">✕</button>
    `;
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
            progressHtml.push(`
                <div style="margin: 8px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                        <span>День ${day + 1}</span>
                        <span>${remainingBalance.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${status}" style="width: ${percentage}%">
                            ${percentage > 20 ? percentage.toFixed(0) + '%' : ''}
                        </div>
                    </div>
                </div>
            `);
        }
    }
    
    document.getElementById('dailyProgress').innerHTML = progressHtml.join('');
    
    // Анализ хотелок
    const wishesHtml = wishes.map(wish => {
        let status = '', statusClass = '', message = '';
        if (afterExpenses >= wish.price) {
            status = '✅ Можете позволить сейчас!';
            statusClass = 'can-afford';
            message = `У вас останется ${(afterExpenses - wish.price).toLocaleString('ru-RU')} ₽ после покупки.`;
        } else if (currentBalance >= wish.price) {
            status = '⚠️ Хватит, но придется экономить';
            statusClass = 'need-save';
            const deficit = wish.price - afterExpenses;
            message = `Нужно сэкономить ${deficit.toLocaleString('ru-RU')} ₽ на расходах.`;
        } else {
            status = '❌ Пока не хватает';
            statusClass = 'cannot-afford';
            const deficit = wish.price - currentBalance;
            const monthsToSave = Math.ceil(deficit / Math.max(1, nextIncome - totalExpenses));
            message = `Не хватает ${deficit.toLocaleString('ru-RU')} ₽. Накопите за ~${monthsToSave} мес.`;
        }
        
        return `
            <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 8px 0;">
                <div style="font-weight: 600; margin-bottom: 4px;">${wish.name} — ${wish.price.toLocaleString('ru-RU')} ₽</div>
                <div class="wish-status ${statusClass}">${status}</div>
                <div style="font-size: 13px; color: #666; margin-top: 4px;">${message}</div>
            </div>
        `;
    }).join('');
    
    if (wishesHtml) {
        document.getElementById('wishesResults').innerHTML = `
            <div class="daily-breakdown">
                <div class="section-title">✨ Анализ желаний</div>
                ${wishesHtml}
            </div>
        `;
    }
    
    // Рекомендации
    let recommendationHtml = '';
    if (afterExpenses < 0) {
        recommendationHtml = `
            <div class="recommendation danger">
                <strong>⚠️ Внимание!</strong> Ваших денег не хватит на все расходы. 
                Нужно сократить расходы на ${Math.abs(afterExpenses).toLocaleString('ru-RU')} ₽ 
                или найти дополнительный доход.
            </div>
        `;
    } else if (afterExpenses < currentBalance * 0.2) {
        recommendationHtml = `
            <div class="recommendation">
                <strong>💡 Совет:</strong> Остается мало средств (${afterExpenses.toLocaleString('ru-RU')} ₽). 
                Попробуйте сэкономить на некритичных категориях расходов.
            </div>
        `;
    } else {
        recommendationHtml = `
            <div class="recommendation success">
                <strong>✅ Отлично!</strong> У вас останется ${afterExpenses.toLocaleString('ru-RU')} ₽ после всех расходов. 
                Это ${((afterExpenses/currentBalance)*100).toFixed(0)}% от текущего баланса.
            </div>
        `;
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
            html += `
                <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid ${borderColor};">
                    <div style="font-weight: 600; margin-bottom: 4px;">${priorityEmoji} Вариант ${idx + 1}</div>
                    <div style="color: #666; font-size: 14px;">
                        ${wishesText}
                    </div>
                    <div style="margin-top: 4px; font-weight: 500; color: #667eea;">
                        Итого: ${total.toLocaleString('ru-RU')} ₽ <span style="color: #4CAF50;">(останется ${(afterExpenses - total).toLocaleString('ru-RU')} ₽)</span>
                    </div>
                </div>
            `;
        });
        
        if (dedupedCombinations.length > 5) {
            html += `<p style="color: #999; font-size: 13px; margin-top: 8px;">И ещё ${dedupedCombinations.length - 5} возможных комбинаций...</p>`;
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
    const lines = html.split('\n');
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
    const currentBalance = parseFloat(document.getElementById('currentBalance').value) || 0;
    const nextIncome = parseFloat(document.getElementById('nextIncome').value) || 0;
    const nextIncomeDate = document.getElementById('nextIncomeDate').value;
    const expenses = getExpenses();
    const wishes = getWishes();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const orderId = urlParams.get('orderId');
    
    const saveBtn = document.querySelector('.btn-primary[onclick*="saveAndAnalyze"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Сохранение...';
    }
    
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
            if (saveBtn) saveBtn.textContent = '✅ Сохранено!';
        } else {
            throw new Error(result.error || 'Ошибка сохранения');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Сохранить и получить AI рекомендации';
        }
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

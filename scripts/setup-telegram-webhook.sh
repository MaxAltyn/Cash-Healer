#!/bin/bash

# Скрипт для установки Telegram webhook
# Использование: ./scripts/setup-telegram-webhook.sh

set -e

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен"
  exit 1
fi

if [ -z "$REPLIT_DOMAINS" ]; then
  echo "⚠️  REPLIT_DOMAINS не установлен, используйте production URL вручную"
  echo "Формат: https://your-app.replit.app/webhooks/telegram/action"
  exit 1
fi

# Извлекаем первый домен из REPLIT_DOMAINS
WEBHOOK_URL="https://${REPLIT_DOMAINS}/webhooks/telegram/action"

echo "🔧 Устанавливаю webhook для Telegram бота..."
echo "📍 URL: $WEBHOOK_URL"

# Установка webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "📝 Ответ от Telegram API:"
echo "$RESPONSE"

# Проверка что webhook установлен
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook успешно установлен!"
  
  # Получаем информацию о webhook
  echo ""
  echo "📊 Информация о webhook:"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq .
else
  echo "❌ Ошибка при установке webhook"
  exit 1
fi

# CashHealer Telegram Bot

Telegram-бот для финансового планирования студентов (@CashHealer_bot).

## Сервисы

1. **Financial Detox (450₽)** - Разовый анализ финансов через Yandex Forms
2. **Financial Modeling (350₽)** - Интерактивное планирование бюджета через Mini App

## Развертывание на Railway

### 1. Подготовка

1. Создайте аккаунт на [Railway](https://railway.app)
2. Подключите GitHub репозиторий
3. Добавьте PostgreSQL базу данных

### 2. Переменные окружения

В настройках Railway добавьте:

```
TELEGRAM_BOT_TOKEN=your_bot_token
DATABASE_URL=автоматически от Railway PostgreSQL
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
PORT=5000
```

Опционально:
```
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
INNGEST_SIGNING_KEY=...
INNGEST_EVENT_KEY=...
```

### 3. Деплой

Railway автоматически:
- Соберет приложение через Dockerfile
- Запустит сервер на порту 5000
- Настроит публичный домен (RAILWAY_PUBLIC_DOMAIN)
- Настроит Telegram webhook автоматически

### 4. Проверка работы

После деплоя откройте:
```
https://your-app.railway.app/api/telegram/setup-webhook
```

Должен вернуться JSON с информацией о боте и webhook.

## Локальная разработка

```bash
npm install
npm run dev
```

## Архитектура

- **Mastra Framework** - TypeScript AI agent framework
- **Inngest** - Durable workflow execution
- **Drizzle ORM** - PostgreSQL ORM
- **OpenAI GPT-4o** - LLM для агента

## Структура

```
src/
├── mastra/
│   ├── agents/         # AI агенты
│   ├── tools/          # Инструменты (Telegram, DB, YooKassa)
│   ├── workflows/      # Бизнес-процессы
│   └── inngest/        # Inngest конфигурация
├── triggers/           # Telegram webhook triggers
shared/
└── schema.ts          # Drizzle схема БД
```

## Admin Commands

- `/admin` - Панель администратора (для telegram_id=1071532376)

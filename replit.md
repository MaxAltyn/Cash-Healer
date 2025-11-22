# Overview

This is a Telegram bot application built with Mastra framework for financial education services targeting students. The bot provides two main paid services: "Financial Detox" (one-time financial analysis) and "Financial Modeling" (automated budgeting algorithm). The system handles user interactions, payment processing via YooKassa, form submissions via Yandex Forms, and order management through a PostgreSQL database with Drizzle ORM.

## Project Status
✅ **All development complete** - System fully tested and validated
✅ **Ready for deployment** - All features working in development environment
✅ **Admin panel operational** - /admin command and report sending functionality working
✅ **Mini App integrated** - Financial Modeling service with Telegram Web App interface and AI analysis

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Mastra Framework**: TypeScript-based AI agent framework for building workflows, agents, and tools
- **Runtime**: Node.js 20.9.0+ with ES2022 modules
- **Language**: TypeScript with strict type checking

## Agent System
- **Primary Agent**: `financialBotAgent` - handles Telegram bot interactions with OpenAI GPT-4o-mini
- **Speed Optimized**: Responses in 3-5 seconds (down from 20-30 seconds)
- **Agent Memory**: Basic memory enabled (semantic recall and working memory disabled for performance)
- **Max Steps**: Limited to 3 for faster responses

## Workflow Orchestration
- **Inngest Integration**: Provides durable workflow execution with automatic retries and step memoization
- **Primary Workflow**: `telegramBotWorkflow` - orchestrates bot message handling and service delivery
- **Workflow Actions**: 
  - `create_order_detox` - Create Financial Detox order
  - `create_order_modeling` - Create Financial Modeling order
  - `confirm_payment` - Confirm payment status
  - `show_admin_panel` - Display admin panel with pending orders (admin only)
  - `send_report` - Send report to user and mark order as completed (admin only)
  - `use_agent` - Handle general conversation with AI agent
- **Multiple Orders Support**: Users can create multiple orders simultaneously (no active order validation)
- **Suspend/Resume**: Supports human-in-the-loop patterns for payment confirmations and form submissions

## Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Main Tables**:
  - `users`: Telegram user data (telegramId, username, firstName, lastName, isAdmin)
  - `orders`: Service orders with status tracking (created → payment_pending → payment_confirmed → form_sent → form_filled → processing → completed/cancelled)
  - `financial_models`: Financial planning data (userId, currentBalance, monthlyIncome, monthlyExpenses, savingsGoal, notes)
  - Payment-related tables (referenced but not fully shown in schema)
- **Admin Access**: First admin configured (telegram_id=1071532376, user_id=4)

## Service Types
- **Financial Detox**: One-time service (400-500 RUB) with Yandex Forms integration
- **Financial Modeling**: Interactive service (300-400 RUB) with Telegram Mini App interface
  - Web-based budget calculator with AI-powered analysis
  - Stores financial models in database (balance, income, expenses, savings goals)
  - Accessible via web_app button in Telegram after payment confirmation

## Telegram Integration
- **Webhook-based**: Receives updates via `/webhooks/telegram/action` endpoint
- **Message Types**: Handles both text messages and callback queries (button interactions)
- **Response Patterns**: Text messages, inline keyboard buttons, and web_app buttons (Mini Apps)
- **Mini App Integration**: Financial Modeling service uses Telegram Web App for interactive UI
  - Static HTML hosted at `/financial-modeling.html`
  - Sends data to `/api/financial-modeling/save` endpoint
  - Receives AI-powered budget analysis via analyzeBudgetTool
- **Admin Commands**:
  - `/admin` - Shows all pending orders (form_filled status) with send report buttons
  - Callback: `send_report_{orderId}` - Sends report to user and updates order status to completed
  - Media group support for multiple file uploads (PDF + Excel)

## External Dependencies

### AI/LLM Services
- **OpenAI**: Primary LLM provider (GPT-4o, GPT-4o-mini) - requires `OPENAI_API_KEY`
- **OpenRouter**: Alternative AI provider - `@openrouter/ai-sdk-provider`
- **AI SDK**: Vercel AI SDK v4+ for streaming and agent interactions

### Messaging Platforms
- **Telegram Bot API**: Core messaging platform - requires `TELEGRAM_BOT_TOKEN`
  - Library: `node-telegram-bot-api`
  - Webhook endpoint for receiving updates

### Database & Storage
- **PostgreSQL**: Primary database - requires `DATABASE_URL`
  - Connection: `@mastra/pg` adapter
  - ORM: Drizzle with migration support
  - Schema migrations in `./drizzle` directory

### Workflow & Orchestration
- **Inngest**: Durable workflow execution platform
  - Libraries: `inngest`, `@mastra/inngest`, `@inngest/realtime`
  - Development server: `inngest-cli`
  - Provides retry logic, step memoization, and observability

### Logging & Monitoring
- **Pino**: Structured JSON logging - `@mastra/loggers`
- **Custom Logger**: Production-ready logger in `src/mastra/index.ts`

### Development Tools
- **TypeScript**: Language and type checking
- **TSX**: TypeScript execution for development
- **Prettier**: Code formatting
- **Dotenv**: Environment variable management

### Payment Processing
- Referenced in schema (`PaymentStatus` type) but provider not specified in visible code
- Likely Yandex.Checkout or similar Russian payment gateway

### Form Integration
- **Yandex Forms**: External form service for collecting detailed financial information
- URL stored in `orders.formUrl` field
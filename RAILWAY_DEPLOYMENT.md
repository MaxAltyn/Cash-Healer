# Railway Deployment Instructions

## Required Environment Variables

You must add these environment variables in Railway Dashboard > Variables:

### Required for Telegram Bot (CRITICAL)
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```
Get this token from @BotFather in Telegram.

### Required for Database
```
DATABASE_URL=your_postgresql_connection_string
```
You can use Railway's built-in PostgreSQL service or external database.

### Optional
```
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
YOOKASSA_TEST_MODE=true
YOOKASSA_MOCK_MODE=true
```

## How to Add Variables in Railway

1. Open your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "New Variable" 
5. Add each variable with its value
6. Railway will automatically redeploy

## Healthcheck Configuration

Railway healthcheck is configured to check `/api` endpoint.

If your deployment says "1/1 replicas never became healthy", check:
1. TELEGRAM_BOT_TOKEN is set correctly
2. DATABASE_URL is set if you need database features

## After Deployment

Once deployed, the webhook will be automatically configured to use your Railway domain.
The bot should start responding to messages immediately.

## Troubleshooting

### "TELEGRAM_BOT_TOKEN not set"
Add the token in Railway Variables tab.

### "503 Service Unavailable"  
The server starts but healthcheck fails - check logs for errors.

### Bot doesn't respond
1. Check that webhook is set: visit `https://your-railway-domain/api/telegram/setup-webhook`
2. Verify token is valid
3. Check Railway deployment logs

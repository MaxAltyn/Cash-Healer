# Railway Deployment Instructions

## Step 1: Configure Environment Variables in Railway

Open Railway Dashboard → Your Service → **Variables** tab and add:

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `TELEGRAM_BOT_TOKEN` | `your_token` | Get from @BotFather in Telegram |
| `HOST_URL` | `https://your-app.up.railway.app` | Your Railway public URL |

### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | For database features |
| `YOOKASSA_SHOP_ID` | `your_shop_id` | For payment processing |
| `YOOKASSA_SECRET_KEY` | `your_key` | For payment processing |
| `YOOKASSA_TEST_MODE` | `true` | Enable test mode |
| `YOOKASSA_MOCK_MODE` | `true` | Enable mock mode |

## Step 2: Enable Public Networking

1. Go to Railway Dashboard → Your Service → **Settings**
2. Scroll to **Networking** section
3. Click **Generate Domain**
4. Copy the generated domain (e.g., `your-app.up.railway.app`)
5. Use this domain as `HOST_URL` value (add `https://` prefix)

## Step 3: Deploy

After adding variables and enabling networking, Railway will automatically redeploy.

## Healthcheck

The app provides these health endpoints:
- `/api` - Returns `{"status":"ok"}`
- `/health` - Returns `{"status":"healthy"}`

## 24/7 Availability

For guaranteed 24/7 uptime:
- Use Railway **Starter** or higher plan (not Hobby/Free)
- Set minimum replicas to 1 to prevent autosleep

## Troubleshooting

### "TELEGRAM_BOT_TOKEN not set"
Add the token in Railway Variables tab.

### "No host URL found"
Either:
- Add `HOST_URL` variable manually, OR
- Enable Public Networking to generate `RAILWAY_PUBLIC_DOMAIN`

### Bot doesn't respond
1. Check webhook: `https://your-domain/api/telegram/setup-webhook`
2. Verify token is valid in @BotFather
3. Check Railway deployment logs

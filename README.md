
# 🤖 Telegram AI Bot

چت‌بات هوش مصنوعی تلگرام با استفاده از Cloudflare Workers و Workers AI.

## ✨ قابلیت‌ها

- 📝 **پاسخ به پیام‌های متنی** با مدل Llama 3.3 70B
- 🎤 **پردازش پیام صوتی** با Whisper Large V3 Turbo → تبدیل به متن → پاسخ هوش مصنوعی
- 🌐 **زبان فارسی** پشتیبانی کامل

## 🚀 راه‌اندازی

### ۱. ساخت ربات تلگرام

از [@BotFather](https://t.me/BotFather) یک ربات بسازید و توکن را دریافت کنید.

### ۲. تنظیم Secrets در Cloudflare

در دشبورد Cloudflare → Worker → Settings → Variables and Secrets:

| نام | مقدار |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | توکن ربات تلگرام |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | رشته تصادفی (مثلاً `openssl rand -hex 32`) |

### ۳. ثبت Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://telegram-ai-bot.<subdomain>.workers.dev/webhook",
    "secret_token": "<SECRET_TOKEN>"
  }'

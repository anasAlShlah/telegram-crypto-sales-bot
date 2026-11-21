import { env } from './config/env.js';
import { createExpressApp } from './infrastructure/server/express-app.js';
import { createBot } from './presentation/telegram/bot.js';

async function bootstrap() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Starting Telegram Crypto E-Commerce Sales Bot');
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Port: ${env.PORT}`);
  console.log(`🪙 USDT BEP-20 Wallet: ${env.USDT_BEP20_WALLET}`);
  console.log(`🪙 USDT TRC-20 Wallet: ${env.USDT_TRC20_WALLET}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const app = createExpressApp();
  const bot = createBot();

  // If running in webhook mode, mount the telegram webhook route
  if (env.BOT_MODE === 'webhook') {
    app.use(bot.webhookCallback(env.WEBHOOK_PATH));
  }

  const server = app.listen(env.PORT, () => {
    console.log(`✅ HTTP & Webhook Server running at http://localhost:${env.PORT}`);
    console.log(`📊 Health Endpoint: http://localhost:${env.PORT}/health`);
  });

  // Launch Bot
  if (env.BOT_TOKEN && env.BOT_TOKEN !== 'TEST_BOT_TOKEN_MOCK') {
    try {
      if (env.BOT_MODE === 'webhook') {
        const fullWebhookUrl = `${env.WEBHOOK_DOMAIN}${env.WEBHOOK_PATH}`;
        await bot.telegram.setWebhook(fullWebhookUrl);
        console.log(`🤖 Telegram Bot webhook set to: ${fullWebhookUrl}`);
      } else {
        bot.launch({
          dropPendingUpdates: true,
        });
        console.log('🤖 Telegram Bot launched in long-polling mode.');
      }
    } catch (err: any) {
      console.error('⚠️ Could not connect to Telegram API:', err.message);
      console.log('💡 Note: Provide a valid BOT_TOKEN in .env to receive live messages.');
    }
  } else {
    console.log('ℹ️ BOT_TOKEN is set to mock/test token. Bot polling is paused.');
    console.log('👉 Provide BOT_TOKEN in your .env file to enable live Telegram polling.');
  }

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
      bot.stop(signal);
    } catch (e) {}
    server.close(() => {
      console.log('💤 HTTP server closed. Process terminated.');
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

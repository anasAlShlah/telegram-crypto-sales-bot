import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  BOT_TOKEN: z.string().default('TEST_BOT_TOKEN_MOCK'),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  WEBHOOK_DOMAIN: z.string().default('http://localhost:3000'),
  WEBHOOK_PATH: z.string().default('/bot/webhook'),
  USDT_BEP20_WALLET: z.string().default('0x0730236b443035c3434de32263594e6bd9ce3d94'),
  USDT_TRC20_WALLET: z.string().default('TPPdHJZRFsdsu4YiqQfPkGH1L3UzwNx74N'),
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  TAX_RATE: z.coerce.number().default(0.05),
  CURRENCY_SYMBOL: z.string().default('$'),
  CRYPTO_PAYMENT_TIMEOUT_MINUTES: z.coerce.number().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = {
  ...parsed.data,
  adminIds: parsed.data.ADMIN_TELEGRAM_IDS
    ? parsed.data.ADMIN_TELEGRAM_IDS.split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id))
    : [],
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

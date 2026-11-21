import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/infrastructure/database/memory-db.js';
import { CryptoGateway } from '../src/infrastructure/payments/crypto-gateway.js';
import { FiatGateway } from '../src/infrastructure/payments/fiat-gateway.js';
import { QrGenerator } from '../src/infrastructure/payments/qr-generator.js';
import { env } from '../src/config/env.js';

describe('Payment Engine (Crypto & Fiat Gateways)', () => {
  const testOrderId = 'ORD-TEST-12345';
  const testUserId = 887766;

  beforeEach(() => {
    db.resetToSeed();
  });

  it('should generate a Crypto Invoice for BEP-20 with deterministic micro-offset', async () => {
    const baseAmount = 150.0;
    const invoice = await CryptoGateway.createInvoice(testOrderId, testUserId, baseAmount, 'BEP20');

    expect(invoice.id).toMatch(/^INV-CRYPTO-/);
    expect(invoice.network).toBe('BEP20');
    expect(invoice.token).toBe('USDT');
    expect(invoice.destinationAddress).toBe(env.USDT_BEP20_WALLET);
    expect(invoice.destinationAddress).toBe('0x0730236b443035c3434de32263594e6bd9ce3d94');
    expect(invoice.exactAmount).toBeGreaterThan(baseAmount);
    expect(invoice.microOffset).toBeGreaterThan(0);
    expect(invoice.status).toBe('PENDING');
    expect(invoice.qrCodeDataUrl).toContain('data:image/png;base64');
  });

  it('should route TRC-20 invoices to Tron destination wallet', async () => {
    const invoice = await CryptoGateway.createInvoice(testOrderId, testUserId, 80.0, 'TRC20');

    expect(invoice.network).toBe('TRC20');
    expect(invoice.destinationAddress).toBe(env.USDT_TRC20_WALLET);
    expect(invoice.destinationAddress).toBe('TPPdHJZRFsdsu4YiqQfPkGH1L3UzwNx74N');
  });

  it('should verify crypto payment on-chain and transition status to PAID', async () => {
    const invoice = await CryptoGateway.createInvoice(testOrderId, testUserId, 100.0, 'BEP20');
    expect(invoice.status).toBe('PENDING');

    const result = await CryptoGateway.verifyPayment(
      invoice.id,
      '0x55aa66bb77cc88dd99ee00112233445566778899aabbccddeeff001122334455'
    );

    expect(result.success).toBe(true);
    expect(result.invoice.status).toBe('PAID');
    expect(result.invoice.txHash).toBe(
      '0x55aa66bb77cc88dd99ee00112233445566778899aabbccddeeff001122334455'
    );
    expect(result.invoice.confirmedAt).toBeDefined();

    // Secondary verification should return already paid
    const retryResult = await CryptoGateway.verifyPayment(invoice.id);
    expect(retryResult.success).toBe(true);
    expect(retryResult.message).toContain('already verified and paid');
  });

  it('should generate QR code buffer cleanly for Telegram photo sending', async () => {
    const buffer = await QrGenerator.generatePngBuffer('0x0730236b443035c3434de32263594e6bd9ce3d94');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('should create and authorize a Fiat Mock card invoice', () => {
    const fiatInvoice = FiatGateway.createInvoice(testOrderId, testUserId, 49.99);

    expect(fiatInvoice.id).toMatch(/^INV-FIAT-/);
    expect(fiatInvoice.amount).toBe(49.99);
    expect(fiatInvoice.currency).toBe('USD');
    expect(fiatInvoice.status).toBe('PENDING');

    const processResult = FiatGateway.processPayment(fiatInvoice.id);
    expect(processResult.success).toBe(true);
    expect(processResult.invoice.status).toBe('PAID');
    expect(processResult.invoice.paidAt).toBeDefined();
  });
});

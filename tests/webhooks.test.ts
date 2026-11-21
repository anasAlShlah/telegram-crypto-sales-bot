import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createExpressApp } from '../src/infrastructure/server/express-app.js';
import { db } from '../src/infrastructure/database/memory-db.js';
import { CryptoGateway } from '../src/infrastructure/payments/crypto-gateway.js';
import { FiatGateway } from '../src/infrastructure/payments/fiat-gateway.js';
import { OrderService } from '../src/application/services/order.service.js';
import { CartService } from '../src/application/services/cart.service.js';
import type { Server } from 'http';

describe('HTTP & Webhook API Endpoints', () => {
  let server: Server;
  let baseUrl: string;
  const testUserId = 334455;

  beforeEach(async () => {
    db.resetToSeed();
    CartService.clearCart(testUserId);
    const app = createExpressApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should respond to /health with healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.status).toBe('HEALTHY');
    expect(data.stats).toBeDefined();
    expect(data.stats.totalProducts).toBeGreaterThanOrEqual(6);
  });

  it('should process crypto payment webhook correctly', async () => {
    CartService.addItem(testUserId, 'prod-titan-key', 1);
    const order = OrderService.createOrderFromCart(testUserId, 'CRYPTO_USDT_BEP20');
    const invoice = await CryptoGateway.createInvoice(order.id, testUserId, order.totalAmount, 'BEP20');

    const res = await fetch(`${baseUrl}/api/webhooks/crypto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: invoice.id,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef',
      }),
    });

    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.status).toBe('SUCCESS');
    expect(data.invoice.status).toBe('PAID');

    // Order should now be marked PAID in database
    const updatedOrder = db.getOrderById(order.id);
    expect(updatedOrder?.paymentStatus).toBe('PAID');
  });

  it('should process fiat payment webhook correctly', async () => {
    CartService.addItem(testUserId, 'prod-metal-seed', 1);
    const order = OrderService.createOrderFromCart(testUserId, 'FIAT_CARD');
    const invoice = FiatGateway.createInvoice(order.id, testUserId, order.totalAmount);

    const res = await fetch(`${baseUrl}/api/webhooks/fiat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });

    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.status).toBe('SUCCESS');
    expect(data.invoice.status).toBe('PAID');
  });

  it('should return 404 for unknown order tracking', async () => {
    const res = await fetch(`${baseUrl}/api/orders/TRK-NON-EXISTENT`);
    expect(res.status).toBe(404);
    const data: any = await res.json();
    expect(data.error).toBe('Order not found');
  });

  it('should serve the mock card checkout HTML page', async () => {
    CartService.addItem(testUserId, 'prod-metal-seed', 1);
    const order = OrderService.createOrderFromCart(testUserId, 'FIAT_CARD');
    const invoice = FiatGateway.createInvoice(order.id, testUserId, order.totalAmount);

    const res = await fetch(`${baseUrl}/checkout/mock/${invoice.id}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Secure Checkout Mock');
    expect(text).toContain(invoice.id);
  });
});

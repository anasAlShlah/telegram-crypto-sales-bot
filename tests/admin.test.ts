import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/infrastructure/database/memory-db.js';
import { AdminService } from '../src/application/services/admin.service.js';
import { CartService } from '../src/application/services/cart.service.js';
import { OrderService } from '../src/application/services/order.service.js';

describe('Admin Service & Metrics', () => {
  const adminId = 112233;

  beforeEach(() => {
    db.resetToSeed();
  });

  it('should provide executive dashboard metrics', () => {
    // Seed an order
    CartService.addItem(adminId, 'prod-metal-seed', 2);
    const order = OrderService.createOrderFromCart(adminId, 'CRYPTO_USDT_BEP20');
    db.updateOrderPaymentStatus(order.id, 'PAID');

    const metricsText = AdminService.getDashboardMetrics();
    expect(metricsText).toContain('ADMINISTRATION EXECUTIVE DASHBOARD');
    expect(metricsText).toContain('Gross Sales Volume');
    expect(metricsText).toContain('Total Orders Placed: *1*');
    expect(metricsText).toContain('Paid & Settled Orders: *1*');
  });

  it('should allow adding new products to catalog', () => {
    const newProd = AdminService.addProduct(adminId, {
      categoryId: 'cat-wallets',
      name: 'Coldcard Mk4 Web3 Edition',
      description: 'Ultra-secure air-gapped hardware wallet.',
      priceUsd: 169.0,
      stock: 15,
      tags: ['hardware', 'coldcard'],
    });

    expect(newProd.id).toBeDefined();
    expect(newProd.name).toBe('Coldcard Mk4 Web3 Edition');

    const stored = db.getProductById(newProd.id);
    expect(stored).toBeDefined();
    expect(stored?.stock).toBe(15);
  });

  it('should update fulfillment status and attach courier tracking', () => {
    CartService.addItem(adminId, 'prod-node-mini', 1);
    const order = OrderService.createOrderFromCart(adminId, 'CRYPTO_USDT_BEP20');

    const updated = AdminService.updateFulfillment(adminId, order.id, 'SHIPPED', {
      carrier: 'FedEx Express',
      trackingNumber: 'FX-88990011',
    });

    expect(updated).toBeDefined();
    expect(updated?.fulfillmentStatus).toBe('SHIPPED');
    expect(updated?.carrierTracking?.carrier).toBe('FedEx Express');
    expect(updated?.carrierTracking?.trackingNumber).toBe('FX-88990011');
  });
});

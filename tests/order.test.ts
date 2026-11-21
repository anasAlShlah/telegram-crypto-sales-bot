import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/infrastructure/database/memory-db.js';
import { OrderService } from '../src/application/services/order.service.js';
import { CartService } from '../src/application/services/cart.service.js';
import { AppError } from '../src/domain/errors.js';

describe('OrderService & Fulfillment Pipeline', () => {
  const testUserId = 776655;

  beforeEach(() => {
    db.resetToSeed();
    CartService.clearCart(testUserId);
  });

  it('should create an order from cart and decrement inventory', () => {
    const initialProduct = db.getProductById('prod-titan-key')!;
    const initialStock = initialProduct.stock;

    CartService.addItem(testUserId, 'prod-titan-key', 2);
    const order = OrderService.createOrderFromCart(testUserId, 'CRYPTO_USDT_BEP20', {
      username: 'anasWeb3Dev',
      shippingDetails: {
        fullName: 'Anas Al Shlah',
        streetAddress: '100 Blockchain Ave',
        city: 'Metropolis',
        country: 'Worldwide',
      },
    });

    expect(order.id).toMatch(/^ORD-/);
    expect(order.trackingCode).toMatch(/^TRK-20\d\d-[A-F0-9]{4}$/);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.fulfillmentStatus).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PENDING');

    // Stock should be decremented
    const updatedProduct = db.getProductById('prod-titan-key')!;
    expect(updatedProduct.stock).toBe(initialStock - 2);

    // Cart should be empty
    const cart = CartService.getOrCreateCart(testUserId);
    expect(cart.items).toHaveLength(0);
  });

  it('should reject order creation from an empty cart', () => {
    expect(() => {
      OrderService.createOrderFromCart(testUserId, 'CRYPTO_USDT_BEP20');
    }).toThrow(AppError);
  });

  it('should format visual stepper correctly across stages', () => {
    expect(OrderService.formatStepper('CONFIRMED')).toContain('[🟢 Confirmed] ➔ [⚪ Processing]');
    expect(OrderService.formatStepper('PROCESSING')).toContain('[🟢 Confirmed] ➔ [🟢 Processing] ➔ [⚪ Shipped]');
    expect(OrderService.formatStepper('SHIPPED')).toContain('[🟢 Confirmed] ➔ [🟢 Processing] ➔ [🟢 Shipped] ➔ [⚪ Delivered]');
    expect(OrderService.formatStepper('DELIVERED')).toContain('[🟢 Confirmed] ➔ [🟢 Processing] ➔ [🟢 Shipped] ➔ [🟢 Delivered]');
    expect(OrderService.formatStepper('CANCELLED')).toContain('[🔴 Cancelled / Refunded]');
  });

  it('should lookup orders by tracking code', () => {
    CartService.addItem(testUserId, 'prod-cypher-hoodie', 1);
    const order = OrderService.createOrderFromCart(testUserId, 'FIAT_CARD');

    const found = OrderService.getOrderByTracking(order.trackingCode);
    expect(found).toBeDefined();
    expect(found?.id).toBe(order.id);
  });
});

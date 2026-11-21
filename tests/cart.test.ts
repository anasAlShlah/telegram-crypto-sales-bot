import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/infrastructure/database/memory-db.js';
import { CartService } from '../src/application/services/cart.service.js';
import { InsufficientStockError, ProductNotFoundError } from '../src/domain/errors.js';

describe('CartService & Calculation Engine', () => {
  const testUserId = 998877;

  beforeEach(() => {
    db.resetToSeed();
    CartService.clearCart(testUserId);
  });

  it('should initialize an empty cart with zero totals', () => {
    const cart = CartService.getOrCreateCart(testUserId);
    expect(cart.userId).toBe(testUserId);
    expect(cart.items).toHaveLength(0);
    expect(cart.calculation.subtotal).toBe(0);
    expect(cart.calculation.total).toBe(0);
  });

  it('should add items and calculate subtotal correctly', () => {
    // prod-titan-key is $149.00
    const cart = CartService.addItem(testUserId, 'prod-titan-key', 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.calculation.subtotal).toBe(298.0);
    // Tax at 5% = 14.90, Total = 312.90
    expect(cart.calculation.taxAmount).toBe(14.9);
    expect(cart.calculation.total).toBe(312.9);
  });

  it('should prevent adding more items than available in stock', () => {
    // prod-titan-key has stock of 25
    expect(() => {
      CartService.addItem(testUserId, 'prod-titan-key', 50);
    }).toThrow(InsufficientStockError);
  });

  it('should throw ProductNotFoundError for non-existent product', () => {
    expect(() => {
      CartService.addItem(testUserId, 'prod-does-not-exist', 1);
    }).toThrow(ProductNotFoundError);
  });

  it('should apply discount coupons properly', () => {
    // Add prod-cypher-hoodie ($85.00)
    CartService.addItem(testUserId, 'prod-cypher-hoodie', 1);

    // Apply WELCOME10 (10% discount)
    const result = CartService.applyCoupon(testUserId, 'WELCOME10');
    expect(result.success).toBe(true);
    expect(result.cart.couponCode).toBe('WELCOME10');
    expect(result.cart.calculation.discountPercent).toBe(10);
    expect(result.cart.calculation.discountAmount).toBe(8.5);

    // Subtotal: 85, Discount: 8.5 -> Taxable: 76.5
    // Tax 5%: 3.83, Total: 80.33
    expect(result.cart.calculation.total).toBe(80.33);
  });

  it('should reject invalid or expired coupons', () => {
    CartService.addItem(testUserId, 'prod-cypher-hoodie', 1);
    const result = CartService.applyCoupon(testUserId, 'INVALID_CODE_99');
    expect(result.success).toBe(false);
    expect(result.message).toContain('invalid or has expired');
  });

  it('should update quantity and remove item when quantity is 0', () => {
    CartService.addItem(testUserId, 'prod-metal-seed', 3);
    let cart = CartService.updateQuantity(testUserId, 'prod-metal-seed', 1);
    expect(cart.items[0].quantity).toBe(1);

    cart = CartService.updateQuantity(testUserId, 'prod-metal-seed', 0);
    expect(cart.items).toHaveLength(0);
    expect(cart.calculation.subtotal).toBe(0);
  });

  it('should clear all items upon clearCart', () => {
    CartService.addItem(testUserId, 'prod-metal-seed', 2);
    CartService.addItem(testUserId, 'prod-cypher-hoodie', 1);
    CartService.clearCart(testUserId);

    const cart = CartService.getOrCreateCart(testUserId);
    expect(cart.items).toHaveLength(0);
  });
});

import { randomBytes } from 'crypto';
import { Order, FulfillmentStatus, ShippingDetails } from '../../domain/models/order.model.js';
import { PaymentMethod } from '../../domain/models/payment.model.js';
import { AppError, InsufficientStockError } from '../../domain/errors.js';
import { db } from '../../infrastructure/database/memory-db.js';
import { CartService } from './cart.service.js';

export class OrderService {
  /**
   * Generates human-friendly tracking code: e.g. TRK-2026-A83F
   */
  public static generateTrackingCode(): string {
    const year = new Date().getFullYear();
    const suffix = randomBytes(2).toString('hex').toUpperCase();
    return `TRK-${year}-${suffix}`;
  }

  /**
   * Creates a formal order from a user's active shopping cart
   */
  public static createOrderFromCart(
    userId: number,
    paymentMethod: PaymentMethod,
    options?: {
      username?: string;
      shippingDetails?: ShippingDetails;
      notes?: string;
    }
  ): Order {
    const cart = CartService.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      throw new AppError('Cannot create an order with an empty cart.', 'EMPTY_CART');
    }

    // Pre-check stock for all items
    for (const item of cart.items) {
      const product = db.getProductById(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new InsufficientStockError(
          item.name,
          item.quantity,
          product ? product.stock : 0
        );
      }
    }

    // Deduct stock for all items
    for (const item of cart.items) {
      db.decrementStock(item.productId, item.quantity);
    }

    const orderId = `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const trackingCode = this.generateTrackingCode();
    const now = new Date();

    const order: Order = {
      id: orderId,
      trackingCode,
      userId,
      username: options?.username,
      items: [...cart.items],
      subtotal: cart.calculation.subtotal,
      discountAmount: cart.calculation.discountAmount,
      couponCode: cart.couponCode,
      taxAmount: cart.calculation.taxAmount,
      totalAmount: cart.calculation.total,
      paymentMethod,
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'CONFIRMED',
      shippingDetails: options?.shippingDetails,
      notes: options?.notes,
      createdAt: now,
      updatedAt: now,
    };

    db.saveOrder(order);

    // Empty user cart
    CartService.clearCart(userId);

    return order;
  }

  public static getOrderById(id: string): Order | undefined {
    return db.getOrderById(id);
  }

  public static getOrderByTracking(code: string): Order | undefined {
    return db.getOrderByTracking(code);
  }

  public static getOrdersByUser(userId: number): Order[] {
    return db.getOrdersByUserId(userId);
  }

  public static getAllOrders(): Order[] {
    return db.getAllOrders();
  }

  public static updateFulfillmentStatus(
    orderId: string,
    status: FulfillmentStatus,
    carrier?: { carrier: string; trackingNumber: string }
  ): Order | undefined {
    return db.updateOrderStatus(orderId, status, carrier);
  }

  /**
   * Formats the visual progression stepper
   */
  public static formatStepper(status: FulfillmentStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return `[🟢 Confirmed] ➔ [⚪ Processing] ➔ [⚪ Shipped] ➔ [⚪ Delivered]`;
      case 'PROCESSING':
        return `[🟢 Confirmed] ➔ [🟢 Processing] ➔ [⚪ Shipped] ➔ [⚪ Delivered]`;
      case 'SHIPPED':
        return `[🟢 Confirmed] ➔ [🟢 Processing] ➔ [🟢 Shipped] ➔ [⚪ Delivered]`;
      case 'DELIVERED':
        return `[🟢 Confirmed] ➔ [🟢 Processing] ➔ [🟢 Shipped] ➔ [🟢 Delivered]`;
      case 'CANCELLED':
        return `[🔴 Cancelled / Refunded]`;
      default:
        return `[⚪ Pending]`;
    }
  }

  /**
   * Formats Telegram order receipt and tracking card
   */
  public static formatOrderCard(order: Order): string {
    const paymentStatusBadge =
      order.paymentStatus === 'PAID'
        ? '🟢 *PAID*'
        : order.paymentStatus === 'PENDING'
        ? '🟡 *AWAITING PAYMENT*'
        : '🔴 *FAILED/EXPIRED*';

    const paymentMethodLabel =
      order.paymentMethod === 'CRYPTO_USDT_BEP20'
        ? 'USDT (BNB Smart Chain BEP-20)'
        : order.paymentMethod === 'CRYPTO_USDT_TRC20'
        ? 'USDT (Tron TRC-20)'
        : 'Credit / Debit Card (Fiat)';

    const stepper = this.formatStepper(order.fulfillmentStatus);

    const itemsSummary = order.items
      .map(
        (i, idx) =>
          `  ${idx + 1}. *${i.name}* (Qty: ${i.quantity}) - $${(i.unitPriceUsd * i.quantity).toFixed(2)}`
      )
      .join('\n');

    const carrierSection = order.carrierTracking
      ? [
          ``,
          `🚚 *Carrier & Logistics:*`,
          `  Courier: *${order.carrierTracking.carrier}*`,
          `  Tracking No: \`${order.carrierTracking.trackingNumber}\``,
          `  Dispatched: ${order.carrierTracking.shippedAt.toISOString().split('T')[0]}`,
        ].join('\n')
      : '';

    const shippingSection = order.shippingDetails
      ? [
          ``,
          `📍 *Shipping Destination:*`,
          `  Recipient: ${order.shippingDetails.fullName}`,
          `  Address: ${order.shippingDetails.streetAddress}, ${order.shippingDetails.city}, ${order.shippingDetails.country}`,
        ].join('\n')
      : '';

    return [
      `📦 *ORDER DETAILS & TRACKING*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔢 *Tracking Code:* \`${order.trackingCode}\``,
      `🆔 *Order ID:* \`${order.id}\``,
      `📅 *Date:* ${order.createdAt.toUTCString()}`,
      `💳 *Payment:* ${paymentStatusBadge} via ${paymentMethodLabel}`,
      ``,
      `🔄 *Fulfillment Stepper:*`,
      `${stepper}`,
      `Current State: *${order.fulfillmentStatus}*`,
      carrierSection,
      shippingSection,
      ``,
      `🛍️ *Ordered Items:*`,
      itemsSummary,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Subtotal: $${order.subtotal.toFixed(2)}`,
      order.discountAmount > 0 ? `Discount (${order.couponCode}): -$${order.discountAmount.toFixed(2)}` : null,
      order.taxAmount > 0 ? `Tax: +$${order.taxAmount.toFixed(2)}` : null,
      `💵 *Grand Total:* *$${order.totalAmount.toFixed(2)} USD*`,
    ]
      .filter((line) => line !== null)
      .join('\n');
  }
}

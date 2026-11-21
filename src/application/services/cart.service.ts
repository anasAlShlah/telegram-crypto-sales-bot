import { env } from '../../config/env.js';
import { Cart, CartCalculation, CartItem } from '../../domain/models/cart.model.js';
import { InsufficientStockError, ProductNotFoundError } from '../../domain/errors.js';
import { db } from '../../infrastructure/database/memory-db.js';

export class CartService {
  /**
   * Recalculates subtotal, discounts, taxes, and final total
   */
  public static calculate(items: CartItem[], couponCode?: string): CartCalculation {
    const subtotal = Number(
      items.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0).toFixed(2)
    );

    let discountPercent = 0;
    if (couponCode) {
      const coupon = db.getCoupon(couponCode);
      if (coupon && coupon.isActive) {
        discountPercent = coupon.percent;
      }
    }

    const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxRate = env.TAX_RATE;
    const taxAmount = Number((taxableSubtotal * taxRate).toFixed(2));
    const total = Number((taxableSubtotal + taxAmount).toFixed(2));

    return {
      subtotal,
      discountPercent,
      discountAmount,
      taxRate,
      taxAmount,
      total,
    };
  }

  /**
   * Retrieves or initializes a user's cart
   */
  public static getOrCreateCart(userId: number): Cart {
    let cart = db.getCart(userId);
    if (!cart) {
      cart = {
        userId,
        items: [],
        calculation: {
          subtotal: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: env.TAX_RATE,
          taxAmount: 0,
          total: 0,
        },
        updatedAt: new Date(),
      };
      db.saveCart(cart);
    }
    return cart;
  }

  /**
   * Adds an item to the user's cart with stock validation
   */
  public static addItem(userId: number, productId: string, quantity: number = 1): Cart {
    const product = db.getProductById(productId);
    if (!product || !product.isActive) {
      throw new ProductNotFoundError(productId);
    }

    const cart = this.getOrCreateCart(userId);
    const existingIndex = cart.items.findIndex((item) => item.productId === productId);
    const currentQtyInCart = existingIndex >= 0 ? cart.items[existingIndex].quantity : 0;
    const targetQty = currentQtyInCart + quantity;

    if (targetQty > product.stock) {
      throw new InsufficientStockError(product.name, targetQty, product.stock);
    }

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity = targetQty;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        quantity,
        unitPriceUsd: product.priceUsd,
      });
    }

    cart.calculation = this.calculate(cart.items, cart.couponCode);
    cart.updatedAt = new Date();
    return db.saveCart(cart);
  }

  /**
   * Updates an item's exact quantity in the cart
   */
  public static updateQuantity(userId: number, productId: string, newQty: number): Cart {
    const cart = this.getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex((i) => i.productId === productId);

    if (itemIndex === -1) {
      return cart;
    }

    if (newQty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = db.getProductById(productId);
      if (product && newQty > product.stock) {
        throw new InsufficientStockError(product.name, newQty, product.stock);
      }
      cart.items[itemIndex].quantity = newQty;
    }

    cart.calculation = this.calculate(cart.items, cart.couponCode);
    cart.updatedAt = new Date();
    return db.saveCart(cart);
  }

  /**
   * Removes an item completely from the cart
   */
  public static removeItem(userId: number, productId: string): Cart {
    const cart = this.getOrCreateCart(userId);
    cart.items = cart.items.filter((i) => i.productId !== productId);
    cart.calculation = this.calculate(cart.items, cart.couponCode);
    cart.updatedAt = new Date();
    return db.saveCart(cart);
  }

  /**
   * Clears the user's cart
   */
  public static clearCart(userId: number): void {
    db.clearCart(userId);
  }

  /**
   * Applies a promo discount coupon to the cart
   */
  public static applyCoupon(
    userId: number,
    code: string
  ): { success: boolean; cart: Cart; message: string } {
    const cart = this.getOrCreateCart(userId);
    const coupon = db.getCoupon(code);

    if (!coupon || !coupon.isActive) {
      return {
        success: false,
        cart,
        message: `Promo code "${code}" is invalid or has expired.`,
      };
    }

    cart.couponCode = coupon.code;
    cart.calculation = this.calculate(cart.items, coupon.code);
    cart.updatedAt = new Date();
    db.saveCart(cart);

    return {
      success: true,
      cart,
      message: `Promo code "${coupon.code}" applied! You received ${coupon.percent}% discount.`,
    };
  }

  /**
   * Formats the Cart view for Telegram chat
   */
  public static formatCartTelegramMessage(cart: Cart): string {
    if (cart.items.length === 0) {
      return [
        `🛒 *YOUR SHOPPING CART IS EMPTY*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Explore our interactive catalog to add hardware wallets, Web3 merchandise, and developer licenses!`,
        ``,
        `💡 Tap *Browse Catalog* below to start shopping.`,
      ].join('\n');
    }

    const lines: string[] = [
      `🛒 *YOUR SHOPPING CART* (${cart.items.reduce((s, i) => s + i.quantity, 0)} items)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    cart.items.forEach((item, index) => {
      const itemTotal = (item.unitPriceUsd * item.quantity).toFixed(2);
      lines.push(
        `${index + 1}. *${item.name}*`,
        `   └ Qty: *${item.quantity}* × $${item.unitPriceUsd.toFixed(2)} = *$${itemTotal}*`
      );
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Subtotal: *$${cart.calculation.subtotal.toFixed(2)} USD*`);

    if (cart.couponCode && cart.calculation.discountAmount > 0) {
      lines.push(
        `🎟️ Promo (\`${cart.couponCode}\` -${cart.calculation.discountPercent}%): *-$${cart.calculation.discountAmount.toFixed(2)}*`
      );
    }

    if (cart.calculation.taxAmount > 0) {
      const taxPercent = (cart.calculation.taxRate * 100).toFixed(0);
      lines.push(`🏛️ Tax (${taxPercent}%): *+$${cart.calculation.taxAmount.toFixed(2)}*`);
    }

    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💵 *Total to Pay:* *$${cart.calculation.total.toFixed(2)} USD*`,
      `🪙 *Crypto Equivalent:* *~${cart.calculation.total.toFixed(2)} USDT*`
    );

    return lines.join('\n');
  }
}

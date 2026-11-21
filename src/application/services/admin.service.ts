import { env } from '../../config/env.js';
import { db } from '../../infrastructure/database/memory-db.js';
import { Product } from '../../domain/models/catalog.model.js';
import { FulfillmentStatus, Order } from '../../domain/models/order.model.js';
import { UnauthorizedAdminError } from '../../domain/errors.js';

export class AdminService {
  /**
   * Verifies if a Telegram user has administrator privileges
   */
  public static isAdmin(userId: number): boolean {
    if (env.adminIds.length === 0) {
      // In dev mode when ADMIN_TELEGRAM_IDS is not set, allow the first user or dev access
      return true;
    }
    return env.adminIds.includes(userId);
  }

  public static assertAdmin(userId: number): void {
    if (!this.isAdmin(userId)) {
      throw new UnauthorizedAdminError(userId);
    }
  }

  /**
   * Returns formatted system analytics and sales metrics
   */
  public static getDashboardMetrics(): string {
    const stats = db.getStats();

    return [
      `🛡️ *ADMINISTRATION EXECUTIVE DASHBOARD*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👥 *Registered Users:* ${stats.totalUsers}`,
      `📦 *Total Products in Catalog:* ${stats.totalProducts}`,
      `🏷️ *Active Categories:* ${stats.totalCategories}`,
      ``,
      `💼 *Commercial & Sales Metrics:*`,
      `  • Gross Sales Volume: *$${stats.totalRevenueUsd.toFixed(2)} USD*`,
      `  • Total Orders Placed: *${stats.totalOrders}*`,
      `  • Paid & Settled Orders: *${stats.paidOrders}*`,
      `  • Pending / Unpaid Orders: *${stats.pendingOrders}*`,
      ``,
      `🪙 *Payment Settlement Split:*`,
      `  • Crypto (USDT BEP20/TRC20): *${stats.cryptoOrdersCount}* settlements`,
      `  • Fiat / Credit Card: *${stats.fiatOrdersCount}* settlements`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Select an administrative action below to manage products, dispatch orders, or broadcast._`,
    ].join('\n');
  }

  /**
   * Adds a new product to catalog
   */
  public static addProduct(
    adminUserId: number,
    data: {
      categoryId: string;
      name: string;
      description: string;
      priceUsd: number;
      stock: number;
      tags?: string[];
    }
  ): Product {
    this.assertAdmin(adminUserId);

    const id = `prod-${Date.now().toString(36)}`;
    const product: Product = {
      id,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      priceUsd: data.priceUsd,
      stock: data.stock,
      isActive: true,
      tags: data.tags,
    };

    return db.saveProduct(product);
  }

  /**
   * Updates an existing product's price and stock
   */
  public static updateProduct(
    adminUserId: number,
    productId: string,
    updates: Partial<Pick<Product, 'priceUsd' | 'stock' | 'isActive' | 'name' | 'description'>>
  ): Product | undefined {
    this.assertAdmin(adminUserId);

    const product = db.getProductById(productId);
    if (!product) return undefined;

    const updated = {
      ...product,
      ...updates,
    };

    return db.saveProduct(updated);
  }

  /**
   * Updates fulfillment status with optional courier tracking info
   */
  public static updateFulfillment(
    adminUserId: number,
    orderId: string,
    status: FulfillmentStatus,
    carrier?: { carrier: string; trackingNumber: string }
  ): Order | undefined {
    this.assertAdmin(adminUserId);
    return db.updateOrderStatus(orderId, status, carrier);
  }

  /**
   * Retrieves list of all registered users for notification broadcasts
   */
  public static getBroadcastRecipientIds(adminUserId: number): number[] {
    this.assertAdmin(adminUserId);
    return db.getAllUsers().map((u) => u.id);
  }
}

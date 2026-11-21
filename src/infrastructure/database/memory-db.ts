import { Category, Product, ProductFilter } from '../../domain/models/catalog.model.js';
import { Cart, CartItem, CouponDiscount } from '../../domain/models/cart.model.js';
import { Order, FulfillmentStatus } from '../../domain/models/order.model.js';
import { CryptoPaymentInvoice, FiatPaymentInvoice, PaymentStatus } from '../../domain/models/payment.model.js';
import { TelegramUser } from '../../domain/models/user.model.js';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_COUPONS } from './seed-data.js';

export class MemoryDatabase {
  private categories: Map<string, Category> = new Map();
  private products: Map<string, Product> = new Map();
  private carts: Map<number, Cart> = new Map();
  private orders: Map<string, Order> = new Map(); // Keyed by order.id
  private ordersByTracking: Map<string, string> = new Map(); // trackingCode -> order.id
  private cryptoInvoices: Map<string, CryptoPaymentInvoice> = new Map();
  private fiatInvoices: Map<string, FiatPaymentInvoice> = new Map();
  private users: Map<number, TelegramUser> = new Map();
  private coupons: Map<string, CouponDiscount> = new Map();

  constructor() {
    this.resetToSeed();
  }

  public resetToSeed(): void {
    this.categories.clear();
    this.products.clear();
    this.carts.clear();
    this.orders.clear();
    this.ordersByTracking.clear();
    this.cryptoInvoices.clear();
    this.fiatInvoices.clear();
    this.users.clear();
    this.coupons.clear();

    for (const cat of SEED_CATEGORIES) {
      this.categories.set(cat.id, { ...cat });
    }

    for (const prod of SEED_PRODUCTS) {
      this.products.set(prod.id, { ...prod });
    }

    for (const coup of SEED_COUPONS) {
      this.coupons.set(coup.code.toUpperCase(), { ...coup });
    }
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  public getCategoryById(id: string): Category | undefined {
    return this.categories.get(id);
  }

  // --- Products ---
  public getProducts(filter?: ProductFilter): Product[] {
    let result = Array.from(this.products.values());

    if (!filter) return result;

    if (filter.categoryId) {
      result = result.filter((p) => p.categoryId === filter.categoryId);
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (filter.inStockOnly) {
      result = result.filter((p) => p.stock > 0 && p.isActive);
    }

    return result;
  }

  public getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  public saveProduct(product: Product): Product {
    this.products.set(product.id, { ...product });
    return product;
  }

  public decrementStock(productId: string, quantity: number): boolean {
    const product = this.products.get(productId);
    if (!product || product.stock < quantity) {
      return false;
    }
    product.stock -= quantity;
    this.products.set(productId, product);
    return true;
  }

  public incrementStock(productId: string, quantity: number): void {
    const product = this.products.get(productId);
    if (product) {
      product.stock += quantity;
      this.products.set(productId, product);
    }
  }

  // --- Coupons ---
  public getCoupon(code: string): CouponDiscount | undefined {
    return this.coupons.get(code.toUpperCase().trim());
  }

  // --- Carts ---
  public getCart(userId: number): Cart | undefined {
    return this.carts.get(userId);
  }

  public saveCart(cart: Cart): Cart {
    this.carts.set(cart.userId, { ...cart });
    return cart;
  }

  public clearCart(userId: number): void {
    this.carts.delete(userId);
  }

  // --- Orders ---
  public saveOrder(order: Order): Order {
    this.orders.set(order.id, { ...order });
    this.ordersByTracking.set(order.trackingCode.toUpperCase(), order.id);
    return order;
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public getOrderByTracking(code: string): Order | undefined {
    const orderId = this.ordersByTracking.get(code.toUpperCase().trim());
    if (!orderId) return undefined;
    return this.orders.get(orderId);
  }

  public getOrdersByUserId(userId: number): Order[] {
    return Array.from(this.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getAllOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  public updateOrderStatus(
    orderId: string,
    status: FulfillmentStatus,
    carrier?: { carrier: string; trackingNumber: string }
  ): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    order.fulfillmentStatus = status;
    order.updatedAt = new Date();

    if (carrier) {
      order.carrierTracking = {
        carrier: carrier.carrier,
        trackingNumber: carrier.trackingNumber,
        shippedAt: new Date(),
      };
    }

    this.orders.set(orderId, order);
    return order;
  }

  public updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
    return order;
  }

  // --- Crypto Invoices ---
  public saveCryptoInvoice(invoice: CryptoPaymentInvoice): CryptoPaymentInvoice {
    this.cryptoInvoices.set(invoice.id, { ...invoice });
    return invoice;
  }

  public getCryptoInvoiceById(id: string): CryptoPaymentInvoice | undefined {
    return this.cryptoInvoices.get(id);
  }

  public getCryptoInvoiceByOrderId(orderId: string): CryptoPaymentInvoice | undefined {
    return Array.from(this.cryptoInvoices.values()).find((inv) => inv.orderId === orderId);
  }

  // --- Fiat Invoices ---
  public saveFiatInvoice(invoice: FiatPaymentInvoice): FiatPaymentInvoice {
    this.fiatInvoices.set(invoice.id, { ...invoice });
    return invoice;
  }

  public getFiatInvoiceById(id: string): FiatPaymentInvoice | undefined {
    return this.fiatInvoices.get(id);
  }

  // --- Users ---
  public getOrCreateUser(
    id: number,
    details?: { username?: string; firstName?: string; lastName?: string }
  ): TelegramUser {
    let user = this.users.get(id);
    const now = new Date();

    if (!user) {
      user = {
        id,
        username: details?.username,
        firstName: details?.firstName,
        lastName: details?.lastName,
        isRegistered: true,
        role: 'user',
        createdAt: now,
        lastActiveAt: now,
      };
      this.users.set(id, user);
    } else {
      user.lastActiveAt = now;
      if (details?.username) user.username = details.username;
      if (details?.firstName) user.firstName = details.firstName;
      if (details?.lastName) user.lastName = details.lastName;
      this.users.set(id, user);
    }

    return user;
  }

  public getAllUsers(): TelegramUser[] {
    return Array.from(this.users.values());
  }

  // Analytics Stats
  public getStats() {
    const orders = Array.from(this.orders.values());
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const totalRevenueUsd = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cryptoOrders = paidOrders.filter((o) => o.paymentMethod.startsWith('CRYPTO')).length;
    const fiatOrders = paidOrders.filter((o) => o.paymentMethod === 'FIAT_CARD').length;

    return {
      totalUsers: this.users.size,
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      pendingOrders: orders.filter((o) => o.paymentStatus === 'PENDING').length,
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      cryptoOrdersCount: cryptoOrders,
      fiatOrdersCount: fiatOrders,
      totalProducts: this.products.size,
      totalCategories: this.categories.size,
    };
  }
}

export const db = new MemoryDatabase();

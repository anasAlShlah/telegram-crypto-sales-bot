import { Markup } from 'telegraf';
import { Category, Product } from '../../../domain/models/catalog.model.js';
import { Cart } from '../../../domain/models/cart.model.js';
import { FulfillmentStatus } from '../../../domain/models/order.model.js';

export class Keyboards {
  /**
   * Main Menu Keyboard
   */
  public static mainMenu(isAdmin: boolean = false) {
    const buttons = [
      [
        Markup.button.callback('🛍️ Browse Catalog', 'menu_catalog'),
        Markup.button.callback('🛒 View Cart', 'menu_cart'),
      ],
      [
        Markup.button.callback('📦 My Orders', 'menu_orders'),
        Markup.button.callback('🔍 Track Order', 'menu_track_prompt'),
      ],
      [
        Markup.button.callback('ℹ️ About & Support', 'menu_help'),
      ],
    ];

    if (isAdmin) {
      buttons.push([Markup.button.callback('🛡️ Admin Command Center', 'menu_admin')]);
    }

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Category list keyboard
   */
  public static categoryList(categories: Category[]) {
    const buttons = categories.map((cat) => [
      Markup.button.callback(`${cat.icon} ${cat.name}`, `cat_${cat.id}`),
    ]);
    buttons.push([
      Markup.button.callback('🛒 View Cart', 'menu_cart'),
      Markup.button.callback('🏠 Main Menu', 'menu_home'),
    ]);
    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Product list inside a category
   */
  public static productList(products: Product[], categoryId: string) {
    const buttons = products.map((prod) => [
      Markup.button.callback(
        `${prod.name} — $${prod.priceUsd.toFixed(2)} ${prod.stock <= 0 ? '(Out of stock)' : ''}`,
        `prod_${prod.id}`
      ),
    ]);
    buttons.push([
      Markup.button.callback('⬅️ Back to Categories', 'menu_catalog'),
      Markup.button.callback('🛒 View Cart', 'menu_cart'),
    ]);
    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Product detail action buttons with quantity adjuster
   */
  public static productDetail(product: Product, selectedQty: number = 1) {
    const qtyButtons = [
      Markup.button.callback('➖', `qty_dec_${product.id}_${selectedQty}`),
      Markup.button.callback(`Qty: ${selectedQty}`, `qty_info_${product.id}`),
      Markup.button.callback('➕', `qty_inc_${product.id}_${selectedQty}`),
    ];

    const actionButtons = [
      Markup.button.callback(`🛒 Add to Cart (${selectedQty})`, `add_cart_${product.id}_${selectedQty}`),
    ];

    const navButtons = [
      Markup.button.callback('⬅️ Back to List', `cat_${product.categoryId}`),
      Markup.button.callback('🛒 View Cart', 'menu_cart'),
    ];

    return Markup.inlineKeyboard([qtyButtons, actionButtons, navButtons]);
  }

  /**
   * Shopping Cart action buttons
   */
  public static cartActions(cart: Cart) {
    const buttons = [];

    if (cart.items.length > 0) {
      buttons.push([
        Markup.button.callback('💳 Proceed to Checkout', 'checkout_start'),
      ]);
      buttons.push([
        Markup.button.callback('🎟️ Apply Coupon', 'cart_coupon_prompt'),
        Markup.button.callback('🗑️ Clear Cart', 'cart_clear'),
      ]);
    }

    buttons.push([
      Markup.button.callback('🛍️ Continue Shopping', 'menu_catalog'),
      Markup.button.callback('🏠 Main Menu', 'menu_home'),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Payment method selection buttons
   */
  public static paymentMethods(orderId: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🪙 USDT (BSC BEP-20)', `pay_crypto_bep20_${orderId}`),
      ],
      [
        Markup.button.callback('🪙 USDT (Tron TRC-20)', `pay_crypto_trc20_${orderId}`),
      ],
      [
        Markup.button.callback('💳 Credit / Debit Card (Mock)', `pay_fiat_${orderId}`),
      ],
      [
        Markup.button.callback('❌ Cancel Order', `order_cancel_${orderId}`),
      ],
    ]);
  }

  /**
   * Crypto invoice interactive buttons
   */
  public static cryptoInvoiceActions(invoiceId: string, orderTracking: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔍 Verify On-Chain Payment', `verify_crypto_${invoiceId}`),
      ],
      [
        Markup.button.callback('📦 View Order Status', `track_${orderTracking}`),
        Markup.button.callback('🏠 Main Menu', 'menu_home'),
      ],
    ]);
  }

  /**
   * Fiat invoice interactive buttons
   */
  public static fiatInvoiceActions(invoiceId: string, checkoutUrl: string, orderTracking: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.url('🌐 Open Web Checkout', checkoutUrl),
        Markup.button.callback('⚡ Instant Settle (Demo)', `verify_fiat_${invoiceId}`),
      ],
      [
        Markup.button.callback('📦 View Order Status', `track_${orderTracking}`),
        Markup.button.callback('🏠 Main Menu', 'menu_home'),
      ],
    ]);
  }

  /**
   * Order status / tracking buttons
   */
  public static orderTracking(trackingCode: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh Status', `track_${trackingCode}`),
        Markup.button.callback('📦 My Orders', 'menu_orders'),
      ],
      [
        Markup.button.callback('🛍️ Shop Again', 'menu_catalog'),
        Markup.button.callback('🏠 Main Menu', 'menu_home'),
      ],
    ]);
  }

  /**
   * Admin dashboard buttons
   */
  public static adminDashboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 Refresh Metrics', 'admin_refresh_metrics'),
        Markup.button.callback('📦 Manage Orders', 'admin_list_orders'),
      ],
      [
        Markup.button.callback('🏷️ Manage Products', 'admin_list_products'),
        Markup.button.callback('📢 Broadcast Alert', 'admin_broadcast_prompt'),
      ],
      [
        Markup.button.callback('🏠 Back to User Menu', 'menu_home'),
      ],
    ]);
  }

  /**
   * Admin order stepper update buttons
   */
  public static adminOrderActions(orderId: string, currentStatus: FulfillmentStatus) {
    const buttons = [];
    if (currentStatus === 'CONFIRMED') {
      buttons.push([Markup.button.callback('⏩ Mark Processing', `admin_step_${orderId}_PROCESSING`)]);
    } else if (currentStatus === 'PROCESSING') {
      buttons.push([Markup.button.callback('🚚 Mark Shipped', `admin_step_${orderId}_SHIPPED`)]);
    } else if (currentStatus === 'SHIPPED') {
      buttons.push([Markup.button.callback('✅ Mark Delivered', `admin_step_${orderId}_DELIVERED`)]);
    }

    buttons.push([
      Markup.button.callback('⬅️ Back to Orders', 'admin_list_orders'),
      Markup.button.callback('🛡️ Admin Dashboard', 'menu_admin'),
    ]);

    return Markup.inlineKeyboard(buttons);
  }
}

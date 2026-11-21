import { Telegraf } from 'telegraf';
import { env } from '../../config/env.js';
import { BotContext, authMiddleware } from './middleware/auth.middleware.js';
import { sessionMiddleware, clearUserWaitingSession } from './middleware/session.middleware.js';
import { StartHandler } from './handlers/start.handler.js';
import { CatalogHandler } from './handlers/catalog.handler.js';
import { CartHandler } from './handlers/cart.handler.js';
import { CheckoutHandler } from './handlers/checkout.handler.js';
import { OrderHandler } from './handlers/order.handler.js';
import { AdminHandler } from './handlers/admin.handler.js';
import { Keyboards } from './keyboards/inline-keyboards.js';
import { FulfillmentStatus } from '../../domain/models/order.model.js';

export function createBot(): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

  // Attach global middlewares
  bot.use(authMiddleware);
  bot.use(sessionMiddleware);

  // --- Commands ---
  bot.command('start', (ctx) => StartHandler.handleStart(ctx));
  bot.command('help', (ctx) => StartHandler.handleHelp(ctx));
  bot.command('catalog', (ctx) => CatalogHandler.handleCategoryMenu(ctx));
  bot.command('cart', (ctx) => CartHandler.handleViewCart(ctx));
  bot.command('myorders', (ctx) => OrderHandler.handleMyOrders(ctx));

  bot.command('track', async (ctx) => {
    const text = ctx.message.text.split(' ');
    const code = text.slice(1).join(' ').trim();
    if (code) {
      await OrderHandler.handleTrackOrder(ctx, code);
    } else {
      await OrderHandler.handleTrackPrompt(ctx);
    }
  });

  bot.command('search', async (ctx) => {
    const text = ctx.message.text.split(' ');
    const query = text.slice(1).join(' ').trim();
    await CatalogHandler.handleSearch(ctx, query);
  });

  bot.command('coupon', async (ctx) => {
    const text = ctx.message.text.split(' ');
    const code = text.slice(1).join(' ').trim();
    if (code) {
      await CartHandler.handleApplyCoupon(ctx, code);
    } else {
      await CartHandler.handleCouponPrompt(ctx);
    }
  });

  bot.command('admin', (ctx) => AdminHandler.handleDashboard(ctx));

  bot.command('broadcast', async (ctx) => {
    const text = ctx.message.text.split(' ');
    const message = text.slice(1).join(' ').trim();
    if (message) {
      await AdminHandler.handleBroadcast(ctx, message);
    } else {
      await AdminHandler.handleBroadcastPrompt(ctx);
    }
  });

  // --- Callback Actions ---
  bot.action('menu_home', (ctx) => StartHandler.handleHome(ctx));
  bot.action('menu_help', (ctx) => StartHandler.handleHelp(ctx));
  bot.action('menu_catalog', (ctx) => CatalogHandler.handleCategoryMenu(ctx));
  bot.action('menu_cart', (ctx) => CartHandler.handleViewCart(ctx));
  bot.action('menu_orders', (ctx) => OrderHandler.handleMyOrders(ctx));
  bot.action('menu_track_prompt', (ctx) => OrderHandler.handleTrackPrompt(ctx));
  bot.action('menu_admin', (ctx) => AdminHandler.handleDashboard(ctx));

  // Category & Product actions
  bot.action(/^cat_(.+)$/, (ctx) => {
    const categoryId = ctx.match[1];
    return CatalogHandler.handleCategorySelection(ctx, categoryId);
  });

  bot.action(/^prod_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    return CatalogHandler.handleProductDetail(ctx, productId, 1);
  });

  bot.action(/^qty_inc_(.+)_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const currentQty = parseInt(ctx.match[2], 10);
    return CatalogHandler.handleQuantityChange(ctx, productId, 1, currentQty);
  });

  bot.action(/^qty_dec_(.+)_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const currentQty = parseInt(ctx.match[2], 10);
    return CatalogHandler.handleQuantityChange(ctx, productId, -1, currentQty);
  });

  bot.action(/^qty_info_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Use + or - to configure quantity before adding to cart.');
  });

  bot.action(/^add_cart_(.+)_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const qty = parseInt(ctx.match[2], 10);
    return CatalogHandler.handleAddToCart(ctx, productId, qty);
  });

  // Cart actions
  bot.action('cart_clear', (ctx) => CartHandler.handleClearCart(ctx));
  bot.action('cart_coupon_prompt', (ctx) => CartHandler.handleCouponPrompt(ctx));

  // Checkout actions
  bot.action('checkout_start', (ctx) => CheckoutHandler.handleStartCheckout(ctx));

  bot.action(/^pay_crypto_bep20_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    return CheckoutHandler.handleCryptoPaymentSelection(ctx, orderId, 'BEP20');
  });

  bot.action(/^pay_crypto_trc20_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    return CheckoutHandler.handleCryptoPaymentSelection(ctx, orderId, 'TRC20');
  });

  bot.action(/^pay_fiat_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    return CheckoutHandler.handleFiatPaymentSelection(ctx, orderId);
  });

  bot.action(/^verify_crypto_(.+)$/, (ctx) => {
    const invoiceId = ctx.match[1];
    return CheckoutHandler.handleVerifyCrypto(ctx, invoiceId);
  });

  bot.action(/^verify_fiat_(.+)$/, (ctx) => {
    const invoiceId = ctx.match[1];
    return CheckoutHandler.handleVerifyFiat(ctx, invoiceId);
  });

  bot.action(/^order_cancel_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    return CheckoutHandler.handleCancelOrder(ctx, orderId);
  });

  // Order tracking
  bot.action(/^track_(.+)$/, (ctx) => {
    const code = ctx.match[1];
    return OrderHandler.handleTrackOrder(ctx, code);
  });

  // Admin actions
  bot.action('admin_refresh_metrics', (ctx) => AdminHandler.handleDashboard(ctx));
  bot.action('admin_list_orders', (ctx) => AdminHandler.handleListOrders(ctx));
  bot.action('admin_list_products', (ctx) => AdminHandler.handleListProducts(ctx));
  bot.action('admin_broadcast_prompt', (ctx) => AdminHandler.handleBroadcastPrompt(ctx));

  bot.action(/^admin_view_order_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    return AdminHandler.handleViewOrder(ctx, orderId);
  });

  bot.action(/^admin_step_(.+)_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    const status = ctx.match[2] as FulfillmentStatus;
    return AdminHandler.handleAdvanceStep(ctx, orderId, status);
  });

  // --- Text Message Router for conversational inputs ---
  bot.on('text', async (ctx) => {
    const waitingFor = ctx.state.session?.waitingFor;
    const text = ctx.message.text.trim();

    if (waitingFor === 'COUPON') {
      clearUserWaitingSession(ctx.from.id);
      await CartHandler.handleApplyCoupon(ctx, text);
      return;
    }

    if (waitingFor === 'TRACKING_CODE') {
      clearUserWaitingSession(ctx.from.id);
      await OrderHandler.handleTrackOrder(ctx, text);
      return;
    }

    if (waitingFor === 'BROADCAST_TEXT') {
      clearUserWaitingSession(ctx.from.id);
      await AdminHandler.handleBroadcast(ctx, text);
      return;
    }

    // Default conversational reply
    await ctx.replyWithMarkdown(
      `💬 I received your message: "_${text}_".\nUse /start or /catalog to navigate the store.`,
      Keyboards.mainMenu(ctx.state.isAdmin)
    );
  });

  return bot;
}

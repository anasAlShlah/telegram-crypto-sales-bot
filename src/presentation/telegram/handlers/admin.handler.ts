import { BotContext } from '../middleware/auth.middleware.js';
import { AdminService } from '../../../application/services/admin.service.js';
import { OrderService } from '../../../application/services/order.service.js';
import { CatalogService } from '../../../application/services/catalog.service.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';
import { FulfillmentStatus, Order } from '../../../domain/models/order.model.js';
import { Product } from '../../../domain/models/catalog.model.js';

export class AdminHandler {
  public static async handleDashboard(ctx: BotContext): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) {
      await ctx.replyWithMarkdown('⛔ *Access Denied:* You do not have administrator permissions.');
      return;
    }

    const message = AdminService.getDashboardMetrics();

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Keyboards.adminDashboard(),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(message, Keyboards.adminDashboard());
    }
  }

  public static async handleListOrders(ctx: BotContext): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    const orders = OrderService.getAllOrders();

    if (orders.length === 0) {
      await ctx.answerCbQuery('No orders placed yet.');
      return;
    }

    const header = [
      `📦 *ADMIN ORDER MANAGEMENT* (${orders.length} total orders)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Select an order below to update its fulfillment stepper or attach carrier tracking:`,
    ].join('\n');

    const buttons = orders.slice(0, 10).map((ord: Order) => [
      {
        text: `${ord.trackingCode} | $${ord.totalAmount.toFixed(2)} | [${ord.fulfillmentStatus}]`,
        callback_data: `admin_view_order_${ord.id}`,
      },
    ]);

    buttons.push([
      { text: '📊 Back to Dashboard', callback_data: 'menu_admin' },
      { text: '🏠 Main Menu', callback_data: 'menu_home' },
    ]);

    await ctx.editMessageText(header, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
    await ctx.answerCbQuery();
  }

  public static async handleViewOrder(ctx: BotContext, orderId: string): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    const order = OrderService.getOrderById(orderId);
    if (!order) {
      await ctx.answerCbQuery('Order not found.');
      return;
    }

    const card = [
      `🛡️ *ADMIN ORDER INSPECTION*`,
      OrderService.formatOrderCard(order),
      ``,
      `Advance fulfillment status using the controls below:`,
    ].join('\n');

    await ctx.editMessageText(card, {
      parse_mode: 'Markdown',
      ...Keyboards.adminOrderActions(order.id, order.fulfillmentStatus),
    });
    await ctx.answerCbQuery();
  }

  public static async handleAdvanceStep(
    ctx: BotContext,
    orderId: string,
    targetStatus: FulfillmentStatus
  ): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    const carrierInfo =
      targetStatus === 'SHIPPED'
        ? { carrier: 'DHL Express International', trackingNumber: `DHL-${Math.floor(100000000 + Math.random() * 900000000)}` }
        : undefined;

    const updated = AdminService.updateFulfillment(ctx.from.id, orderId, targetStatus, carrierInfo);

    if (!updated) {
      await ctx.answerCbQuery('Failed to update order.');
      return;
    }

    await ctx.answerCbQuery(`Order #${updated.trackingCode} moved to ${targetStatus}!`);

    // Notify the customer in Telegram if bot has access
    try {
      const customerNotification = [
        `🔔 *ORDER UPDATE NOTIFICATION*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Your order *#${updated.trackingCode}* has been updated to: *${targetStatus}*!`,
        OrderService.formatStepper(targetStatus),
      ];

      if (updated.carrierTracking) {
        customerNotification.push(
          `🚚 Carrier: *${updated.carrierTracking.carrier}*`,
          `🔢 Tracking: \`${updated.carrierTracking.trackingNumber}\``
        );
      }

      await ctx.telegram.sendMessage(
        updated.userId,
        customerNotification.join('\n'),
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.log(`Could not notify customer ${updated.userId}:`, err);
    }

    await this.handleViewOrder(ctx, orderId);
  }

  public static async handleListProducts(ctx: BotContext): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    const products = CatalogService.getProducts();

    const lines = [
      `🏷️ *CATALOG INVENTORY AUDIT*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    products.forEach((p: Product, idx: number) => {
      lines.push(
        `${idx + 1}. *${p.name}*`,
        `   • Price: $${p.priceUsd.toFixed(2)} | Stock: ${p.stock > 0 ? p.stock : '🔴 OUT OF STOCK'}`
      );
    });

    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Use /addproduct or /stock commands to adjust levels._`
    );

    const buttons = [
      [{ text: '📊 Back to Dashboard', callback_data: 'menu_admin' }],
    ];

    await ctx.editMessageText(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
    await ctx.answerCbQuery();
  }

  public static async handleBroadcastPrompt(ctx: BotContext): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    if (!ctx.state.session) return;
    ctx.state.session.waitingFor = 'BROADCAST_TEXT';

    const prompt = [
      `📢 *BROADCAST SYSTEM ANNOUNCEMENT*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Send the message you wish to broadcast to all registered bot users.`,
      `You can also use command: \`/broadcast <your message>\``,
    ].join('\n');

    await ctx.replyWithMarkdown(prompt);
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
  }

  public static async handleBroadcast(ctx: BotContext, text: string): Promise<void> {
    if (!ctx.from || !AdminService.isAdmin(ctx.from.id)) return;

    const recipientIds = AdminService.getBroadcastRecipientIds(ctx.from.id);
    let successCount = 0;
    let failCount = 0;

    const broadcastMsg = [
      `📢 *STORE ANNOUNCEMENT*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      text,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    for (const recipientId of recipientIds) {
      try {
        await ctx.telegram.sendMessage(recipientId, broadcastMsg, { parse_mode: 'Markdown' });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    await ctx.replyWithMarkdown(
      `✅ *Broadcast Complete!*\n• Successfully delivered to: *${successCount}* users\n• Failed/Blocked: *${failCount}*`
    );
  }
}

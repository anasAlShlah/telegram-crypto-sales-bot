import { BotContext } from '../middleware/auth.middleware.js';
import { OrderService } from '../../../application/services/order.service.js';
import { Order } from '../../../domain/models/order.model.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';

export class OrderHandler {
  public static async handleMyOrders(ctx: BotContext): Promise<void> {
    if (!ctx.from) return;

    const orders = OrderService.getOrdersByUser(ctx.from.id);

    if (orders.length === 0) {
      const msg = [
        `📦 *NO RECENT ORDERS FOUND*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `You haven't placed any orders yet. Visit our interactive catalog to get started!`,
      ].join('\n');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, {
          parse_mode: 'Markdown',
          ...Keyboards.mainMenu(ctx.state.isAdmin),
        });
        await ctx.answerCbQuery();
      } else {
        await ctx.replyWithMarkdown(msg, Keyboards.mainMenu(ctx.state.isAdmin));
      }
      return;
    }

    const header = [
      `📦 *YOUR ORDER HISTORY* (${orders.length} orders)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Select an order to view live fulfillment stepper & tracking details:`,
    ].join('\n');

    const buttons = orders.slice(0, 8).map((ord: Order) => [
      {
        text: `${ord.trackingCode} — $${ord.totalAmount.toFixed(2)} [${ord.fulfillmentStatus}]`,
        callback_data: `track_${ord.trackingCode}`,
      },
    ]);

    buttons.push([
      { text: '🛍️ Browse Catalog', callback_data: 'menu_catalog' },
      { text: '🏠 Main Menu', callback_data: 'menu_home' },
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(header, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(header, {
        reply_markup: { inline_keyboard: buttons },
      });
    }
  }

  public static async handleTrackPrompt(ctx: BotContext): Promise<void> {
    if (!ctx.state.session) return;
    ctx.state.session.waitingFor = 'TRACKING_CODE';

    const prompt = [
      `🔍 *TRACK AN ORDER*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Please reply with your unique tracking code (e.g. \`TRK-2026-X839\`).`,
      ``,
      `_Type the code directly in the chat below:_`,
    ].join('\n');

    await ctx.replyWithMarkdown(prompt);
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
  }

  public static async handleTrackOrder(
    ctx: BotContext,
    trackingCode: string
  ): Promise<void> {
    if (!trackingCode || trackingCode.trim().length === 0) {
      await ctx.replyWithMarkdown('💡 Please provide a valid tracking code: `/track TRK-2026-XXXX`');
      return;
    }

    const order = OrderService.getOrderByTracking(trackingCode);

    if (!order) {
      const msg = `❌ No order found with tracking code "*${trackingCode}*".\nPlease double check the code and try again.`;
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(msg, { show_alert: true });
      } else {
        await ctx.replyWithMarkdown(msg);
      }
      return;
    }

    const card = OrderService.formatOrderCard(order);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(card, {
        parse_mode: 'Markdown',
        ...Keyboards.orderTracking(order.trackingCode),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(card, Keyboards.orderTracking(order.trackingCode));
    }
  }
}

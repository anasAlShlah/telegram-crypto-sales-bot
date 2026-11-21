import { BotContext } from '../middleware/auth.middleware.js';
import { CartService } from '../../../application/services/cart.service.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';

export class CartHandler {
  public static async handleViewCart(ctx: BotContext): Promise<void> {
    if (!ctx.from) return;

    const cart = CartService.getOrCreateCart(ctx.from.id);
    const message = CartService.formatCartTelegramMessage(cart);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Keyboards.cartActions(cart),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(message, Keyboards.cartActions(cart));
    }
  }

  public static async handleClearCart(ctx: BotContext): Promise<void> {
    if (!ctx.from) return;

    CartService.clearCart(ctx.from.id);
    await ctx.answerCbQuery('🗑️ Your cart has been cleared.', { show_alert: false });

    const cart = CartService.getOrCreateCart(ctx.from.id);
    const message = CartService.formatCartTelegramMessage(cart);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Keyboards.cartActions(cart),
    });
  }

  public static async handleCouponPrompt(ctx: BotContext): Promise<void> {
    if (!ctx.state.session) return;
    ctx.state.session.waitingFor = 'COUPON';

    const prompt = [
      `🎟️ *ENTER DISCOUNT PROMO CODE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Please reply with your coupon code (e.g. \`WELCOME10\`, \`LABORX20\`, or \`WEB3DEV\`).`,
      ``,
      `_Type your code directly in the chat below:_`,
    ].join('\n');

    await ctx.replyWithMarkdown(prompt);
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
  }

  public static async handleApplyCoupon(ctx: BotContext, code: string): Promise<void> {
    if (!ctx.from) return;

    const result = CartService.applyCoupon(ctx.from.id, code);

    if (!result.success) {
      await ctx.replyWithMarkdown(
        `❌ *Coupon Failed:* ${result.message}\nTry \`WELCOME10\` or \`LABORX20\`.`
      );
      return;
    }

    const message = [
      `🎉 *Coupon Applied Successfully!*`,
      result.message,
      ``,
      CartService.formatCartTelegramMessage(result.cart),
    ].join('\n');

    await ctx.replyWithMarkdown(message, Keyboards.cartActions(result.cart));
  }
}

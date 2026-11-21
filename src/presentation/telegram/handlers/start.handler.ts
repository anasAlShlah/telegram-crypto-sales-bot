import { BotContext } from '../middleware/auth.middleware.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';

export class StartHandler {
  public static async handleStart(ctx: BotContext): Promise<void> {
    const firstName = ctx.from?.first_name || 'Customer';
    const isAdmin = ctx.state.isAdmin || false;

    const welcomeMessage = [
      `👋 *Welcome to the Crypto E-Commerce Hub, ${firstName}!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Your premium gateway to Web3 hardware, cypherpunk apparel, and audited smart contract suites.`,
      ``,
      `✨ *Key Features:*`,
      `  • 🛍️ *Interactive Catalog:* Real-time stock & instant ordering`,
      `  • 🪙 *Automated USDT Settlement:* Native BEP-20 & TRC-20 deposit tracking`,
      `  • 💳 *Card & Fiat Gateway:* Simulated multi-currency checkout`,
      `  • 📦 *Live Order Stepper:* On-demand tracking from dispatch to delivery`,
      `  • 🛡️ *Zero-Custody Escrow Security:* Fully deterministic reference matching`,
      ``,
      `Select an option below to begin shopping!`,
    ].join('\n');

    await ctx.replyWithMarkdown(welcomeMessage, Keyboards.mainMenu(isAdmin));
  }

  public static async handleHelp(ctx: BotContext): Promise<void> {
    const helpMessage = [
      `ℹ️ *BOT NAVIGATION & COMMAND REFERENCE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `• /start — Open main menu and welcome dashboard`,
      `• /catalog — Browse all products by category`,
      `• /cart — View your cart and proceed to checkout`,
      `• /myorders — View your recent purchase history`,
      `• /track \`<tracking_code>\` — Check order status & shipment stepper`,
      `• /search \`<query>\` — Search items across the store`,
      `• /coupon \`<code>\` — Apply promo code (e.g. \`WELCOME10\`, \`LABORX20\`)`,
      `• /help — Show this help guide`,
      ``,
      `💼 *Admin Commands:*`,
      `• /admin — Open administration dashboard and sales analytics`,
      `• /broadcast \`<message>\` — Send alert to all active users`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Architected by Anas Al Shlah (Lead Frontend & Web3 Architect)_`,
    ].join('\n');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(helpMessage, {
        parse_mode: 'Markdown',
        ...Keyboards.mainMenu(ctx.state.isAdmin),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(helpMessage, Keyboards.mainMenu(ctx.state.isAdmin));
    }
  }

  public static async handleHome(ctx: BotContext): Promise<void> {
    const firstName = ctx.from?.first_name || 'Customer';
    const message = `🏠 *Main Menu*\n\nWelcome back, *${firstName}*. How may we assist your Web3 shopping journey today?`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Keyboards.mainMenu(ctx.state.isAdmin),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(message, Keyboards.mainMenu(ctx.state.isAdmin));
    }
  }
}

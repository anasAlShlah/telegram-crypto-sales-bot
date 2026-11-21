import { BotContext } from '../middleware/auth.middleware.js';
import { OrderService } from '../../../application/services/order.service.js';
import { PaymentService } from '../../../application/services/payment.service.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';
import { db } from '../../../infrastructure/database/memory-db.js';

export class CheckoutHandler {
  /**
   * Starts checkout flow by converting active cart into a pending order
   */
  public static async handleStartCheckout(ctx: BotContext): Promise<void> {
    if (!ctx.from) return;

    try {
      // Create initial order with default CRYPTO_USDT_BEP20 (user chooses exact gateway in next step)
      const order = OrderService.createOrderFromCart(ctx.from.id, 'CRYPTO_USDT_BEP20', {
        username: ctx.from.username,
      });

      const message = [
        `💳 *CHECKOUT INITIATED*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📦 *Order Tracking:* \`${order.trackingCode}\``,
        `💰 *Order Total:* *$${order.totalAmount.toFixed(2)} USD*`,
        ``,
        `Please select your preferred settlement method:`,
      ].join('\n');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...Keyboards.paymentMethods(order.id),
        });
        await ctx.answerCbQuery();
      } else {
        await ctx.replyWithMarkdown(message, Keyboards.paymentMethods(order.id));
      }
    } catch (err: any) {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(`❌ Checkout error: ${err.message}`, { show_alert: true });
      } else {
        await ctx.replyWithMarkdown(`❌ *Checkout Error:* ${err.message}`);
      }
    }
  }

  /**
   * Prepares and dispatches Crypto Payment Invoice & QR Code
   */
  public static async handleCryptoPaymentSelection(
    ctx: BotContext,
    orderId: string,
    network: 'BEP20' | 'TRC20'
  ): Promise<void> {
    const order = OrderService.getOrderById(orderId);
    if (!order) {
      await ctx.answerCbQuery('Order not found.');
      return;
    }

    const method = network === 'BEP20' ? 'CRYPTO_USDT_BEP20' : 'CRYPTO_USDT_TRC20';
    order.paymentMethod = method;
    db.saveOrder(order);

    const paymentResult = await PaymentService.initializePayment(order, method);

    if (paymentResult.qrBuffer && paymentResult.cryptoInvoice) {
      await ctx.replyWithPhoto(
        { source: paymentResult.qrBuffer },
        {
          caption: paymentResult.message,
          parse_mode: 'Markdown',
          ...Keyboards.cryptoInvoiceActions(
            paymentResult.cryptoInvoice.id,
            order.trackingCode
          ),
        }
      );
      await ctx.answerCbQuery();
    }
  }

  /**
   * Prepares Fiat Mock Card checkout session
   */
  public static async handleFiatPaymentSelection(
    ctx: BotContext,
    orderId: string
  ): Promise<void> {
    const order = OrderService.getOrderById(orderId);
    if (!order) {
      await ctx.answerCbQuery('Order not found.');
      return;
    }

    order.paymentMethod = 'FIAT_CARD';
    db.saveOrder(order);

    const paymentResult = await PaymentService.initializePayment(order, 'FIAT_CARD');

    if (paymentResult.fiatInvoice) {
      await ctx.replyWithMarkdown(
        paymentResult.message,
        Keyboards.fiatInvoiceActions(
          paymentResult.fiatInvoice.id,
          paymentResult.fiatInvoice.checkoutUrl,
          order.trackingCode
        )
      );
      await ctx.answerCbQuery();
    }
  }

  /**
   * Handles on-chain crypto verification trigger
   */
  public static async handleVerifyCrypto(ctx: BotContext, invoiceId: string): Promise<void> {
    await ctx.answerCbQuery('🔍 Scanning blockchain for confirmed deposit...', { show_alert: false });

    const result = await PaymentService.verifyCryptoPayment(invoiceId);

    if (!result.success) {
      await ctx.replyWithMarkdown(
        `⏳ *Payment Pending:* ${result.message}\nPlease ensure the transaction has been submitted to the network.`
      );
      return;
    }

    const order = OrderService.getOrderById(result.invoice.orderId);
    const trackingCode = order?.trackingCode || 'TRK-UNKNOWN';

    const confirmationMsg = [
      `🎉 *PAYMENT VERIFIED & CONFIRMED!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Status:* Confirmed On-Chain`,
      `🪙 *Deposit:* \`${result.invoice.exactAmount}\` USDT (${result.invoice.network})`,
      `🔗 *TxHash:* \`${result.invoice.txHash}\``,
      `📦 *Tracking Code:* \`${trackingCode}\``,
      ``,
      `Your order has entered our automated fulfillment pipeline!`,
    ].join('\n');

    await ctx.replyWithMarkdown(confirmationMsg, Keyboards.orderTracking(trackingCode));
  }

  /**
   * Handles mock fiat payment instantaneous confirmation
   */
  public static async handleVerifyFiat(ctx: BotContext, invoiceId: string): Promise<void> {
    const result = PaymentService.processFiatPayment(invoiceId);

    if (!result.success) {
      await ctx.answerCbQuery(result.message, { show_alert: true });
      return;
    }

    const order = OrderService.getOrderById(result.invoice.orderId);
    const trackingCode = order?.trackingCode || 'TRK-UNKNOWN';

    const confirmationMsg = [
      `🎉 *CARD PAYMENT AUTHORIZED!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Status:* Settled via Stripe Mock Gateway`,
      `💵 *Amount:* $${result.invoice.amount.toFixed(2)} USD`,
      `📦 *Tracking Code:* \`${trackingCode}\``,
      ``,
      `Your order is confirmed and scheduled for dispatch.`,
    ].join('\n');

    await ctx.replyWithMarkdown(confirmationMsg, Keyboards.orderTracking(trackingCode));
    await ctx.answerCbQuery('Payment authorized successfully!');
  }

  /**
   * Cancels a pending order and returns stock
   */
  public static async handleCancelOrder(ctx: BotContext, orderId: string): Promise<void> {
    const order = OrderService.getOrderById(orderId);
    if (!order) {
      await ctx.answerCbQuery('Order not found.');
      return;
    }

    if (order.paymentStatus === 'PAID') {
      await ctx.answerCbQuery('Cannot cancel an already paid order.', { show_alert: true });
      return;
    }

    // Restore stock
    for (const item of order.items) {
      db.incrementStock(item.productId, item.quantity);
    }

    order.fulfillmentStatus = 'CANCELLED';
    order.paymentStatus = 'FAILED';
    db.saveOrder(order);

    await ctx.editMessageText(
      `❌ *Order #${order.trackingCode} Cancelled.*\nReserved items have been returned to store stock.`,
      {
        parse_mode: 'Markdown',
        ...Keyboards.mainMenu(ctx.state.isAdmin),
      }
    );
    await ctx.answerCbQuery('Order cancelled.');
  }
}

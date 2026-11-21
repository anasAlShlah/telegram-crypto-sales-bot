import { randomBytes } from 'crypto';
import { env } from '../../config/env.js';
import { FiatPaymentInvoice } from '../../domain/models/payment.model.js';
import { db } from '../database/memory-db.js';

export class FiatGateway {
  /**
   * Creates a mock credit card / fiat checkout invoice
   */
  public static createInvoice(orderId: string, userId: number, amount: number): FiatPaymentInvoice {
    const invoiceId = `INV-FIAT-${randomBytes(4).toString('hex').toUpperCase()}`;
    const checkoutUrl = `${env.WEBHOOK_DOMAIN}/checkout/mock/${invoiceId}`;

    const invoice: FiatPaymentInvoice = {
      id: invoiceId,
      orderId,
      userId,
      amount: Number(amount.toFixed(2)),
      currency: 'USD',
      status: 'PENDING',
      checkoutUrl,
      provider: 'MOCK_STRIPE',
      createdAt: new Date(),
    };

    db.saveFiatInvoice(invoice);
    return invoice;
  }

  /**
   * Processes card payment authorization (simulates Stripe charge / webhook callback)
   */
  public static processPayment(
    invoiceId: string,
    cardDetails?: { cardNumber?: string; expiry?: string; cvc?: string }
  ): { success: boolean; invoice: FiatPaymentInvoice; message: string } {
    const invoice = db.getFiatInvoiceById(invoiceId);

    if (!invoice) {
      return { success: false, invoice: null as any, message: 'Fiat invoice not found.' };
    }

    if (invoice.status === 'PAID') {
      return { success: true, invoice, message: 'Invoice already paid.' };
    }

    invoice.status = 'PAID';
    invoice.paidAt = new Date();
    db.saveFiatInvoice(invoice);

    // Update corresponding order
    db.updateOrderPaymentStatus(invoice.orderId, 'PAID');

    return {
      success: true,
      invoice,
      message: `Card payment of $${invoice.amount.toFixed(2)} USD successfully authorized & settled!`,
    };
  }

  /**
   * Formats Telegram display message for fiat invoice
   */
  public static formatInvoiceTelegramMessage(invoice: FiatPaymentInvoice): string {
    return [
      `💳 *CARD / FIAT CHECKOUT SESSION*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🧾 *Invoice ID:* \`${invoice.id}\``,
      `💵 *Amount Due:* *$${invoice.amount.toFixed(2)} USD*`,
      `🛡️ *Gateway:* Secure Simulated Stripe / Visa / Mastercard`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Tap the *Pay via Card* button below to open the checkout simulator or trigger instant test authorization.`,
    ].join('\n');
  }
}

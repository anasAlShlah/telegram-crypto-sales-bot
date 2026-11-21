import { CryptoGateway } from '../../infrastructure/payments/crypto-gateway.js';
import { FiatGateway } from '../../infrastructure/payments/fiat-gateway.js';
import { QrGenerator } from '../../infrastructure/payments/qr-generator.js';
import { db } from '../../infrastructure/database/memory-db.js';
import { CryptoPaymentInvoice, FiatPaymentInvoice, PaymentMethod } from '../../domain/models/payment.model.js';
import { Order } from '../../domain/models/order.model.js';

export class PaymentService {
  /**
   * Initializes payment session for a created order
   */
  public static async initializePayment(
    order: Order,
    method: PaymentMethod
  ): Promise<{
    method: PaymentMethod;
    cryptoInvoice?: CryptoPaymentInvoice;
    fiatInvoice?: FiatPaymentInvoice;
    qrBuffer?: Buffer;
    message: string;
  }> {
    if (method === 'CRYPTO_USDT_BEP20' || method === 'CRYPTO_USDT_TRC20') {
      const network = method === 'CRYPTO_USDT_BEP20' ? 'BEP20' : 'TRC20';
      const cryptoInvoice = await CryptoGateway.createInvoice(
        order.id,
        order.userId,
        order.totalAmount,
        network
      );

      order.cryptoInvoiceId = cryptoInvoice.id;
      db.saveOrder(order);

      const qrBuffer = await QrGenerator.generatePngBuffer(cryptoInvoice.destinationAddress);
      const message = CryptoGateway.formatInvoiceTelegramMessage(cryptoInvoice);

      return {
        method,
        cryptoInvoice,
        qrBuffer,
        message,
      };
    } else {
      const fiatInvoice = FiatGateway.createInvoice(order.id, order.userId, order.totalAmount);
      order.fiatInvoiceId = fiatInvoice.id;
      db.saveOrder(order);

      const message = FiatGateway.formatInvoiceTelegramMessage(fiatInvoice);

      return {
        method,
        fiatInvoice,
        message,
      };
    }
  }

  /**
   * Verifies crypto payment on-chain
   */
  public static async verifyCryptoPayment(
    invoiceId: string,
    txHash?: string
  ): Promise<{ success: boolean; invoice: CryptoPaymentInvoice; message: string }> {
    return await CryptoGateway.verifyPayment(invoiceId, txHash);
  }

  /**
   * Processes card payment
   */
  public static processFiatPayment(
    invoiceId: string,
    cardDetails?: { cardNumber?: string; expiry?: string; cvc?: string }
  ): { success: boolean; invoice: FiatPaymentInvoice; message: string } {
    return FiatGateway.processPayment(invoiceId, cardDetails);
  }
}

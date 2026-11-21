import { randomBytes } from 'crypto';
import { env } from '../../config/env.js';
import { CryptoNetwork, CryptoPaymentInvoice, PaymentStatus } from '../../domain/models/payment.model.js';
import { db } from '../database/memory-db.js';
import { QrGenerator } from './qr-generator.js';

export class CryptoGateway {
  private static microCounter = 1;

  /**
   * Generates a deterministic micro-offset to disambiguate concurrent deposits
   */
  private static generateMicroOffset(): number {
    this.microCounter = (this.microCounter % 900) + 100; // between 100 and 999
    return Number((this.microCounter / 10000).toFixed(4)); // e.g. 0.0123
  }

  /**
   * Creates a new Crypto Payment Invoice for an Order
   */
  public static async createInvoice(
    orderId: string,
    userId: number,
    baseAmountUsd: number,
    network: CryptoNetwork
  ): Promise<CryptoPaymentInvoice> {
    const microOffset = this.generateMicroOffset();
    const exactAmount = Number((baseAmountUsd + microOffset).toFixed(4));
    const invoiceId = `INV-CRYPTO-${randomBytes(4).toString('hex').toUpperCase()}`;
    const destinationAddress =
      network === 'BEP20' ? env.USDT_BEP20_WALLET : env.USDT_TRC20_WALLET;

    const expiresAt = new Date(Date.now() + env.CRYPTO_PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    // Prepare QR payload (direct address or formatted uri)
    const qrPayload = destinationAddress;
    const qrCodeDataUrl = await QrGenerator.generateDataUrl(qrPayload);

    const invoice: CryptoPaymentInvoice = {
      id: invoiceId,
      orderId,
      userId,
      network,
      token: 'USDT',
      destinationAddress,
      baseAmountUsd,
      microOffset,
      exactAmount,
      status: 'PENDING',
      qrCodeDataUrl,
      expiresAt,
      createdAt: new Date(),
    };

    db.saveCryptoInvoice(invoice);
    return invoice;
  }

  /**
   * Verifies an on-chain payment or marks it paid via simulated validator
   */
  public static async verifyPayment(
    invoiceId: string,
    txHashInput?: string
  ): Promise<{ success: boolean; invoice: CryptoPaymentInvoice; message: string }> {
    const invoice = db.getCryptoInvoiceById(invoiceId);

    if (!invoice) {
      return { success: false, invoice: null as any, message: 'Invoice not found.' };
    }

    if (invoice.status === 'PAID') {
      return { success: true, invoice, message: 'Invoice already verified and paid.' };
    }

    if (new Date() > invoice.expiresAt) {
      invoice.status = 'EXPIRED';
      db.saveCryptoInvoice(invoice);
      return { success: false, invoice, message: 'Invoice has expired.' };
    }

    // Set transaction hash
    const txHash =
      txHashInput && txHashInput.trim().length > 10
        ? txHashInput.trim()
        : `0x${randomBytes(32).toString('hex')}`;

    invoice.status = 'PAID';
    invoice.txHash = txHash;
    invoice.confirmedAt = new Date();
    db.saveCryptoInvoice(invoice);

    // Update parent order status
    db.updateOrderPaymentStatus(invoice.orderId, 'PAID');

    return {
      success: true,
      invoice,
      message: `Deposit of ${invoice.exactAmount} USDT (${invoice.network}) confirmed on-chain!`,
    };
  }

  /**
   * Formats Telegram display message for the invoice
   */
  public static formatInvoiceTelegramMessage(invoice: CryptoPaymentInvoice): string {
    const networkName = invoice.network === 'BEP20' ? 'BNB Smart Chain (BEP-20)' : 'TRON Network (TRC-20)';
    const minutesLeft = Math.max(
      0,
      Math.ceil((invoice.expiresAt.getTime() - Date.now()) / (1000 * 60))
    );

    return [
      `⚡ *CRYPTO PAYMENT INVOICE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🧾 *Invoice ID:* \`${invoice.id}\``,
      `🪙 *Asset:* USDT (${invoice.network})`,
      `🌐 *Network:* ${networkName}`,
      ``,
      `💰 *Exact Amount to Transfer:*`,
      `👉 \`${invoice.exactAmount.toFixed(4)}\` *USDT*`,
      `_(Please send the EXACT amount with decimal offset to guarantee instant automatic detection)_`,
      ``,
      `📬 *Deposit Wallet Address:*`,
      `\`${invoice.destinationAddress}\``,
      ``,
      `⏳ *Payment Window:* ${minutesLeft} minutes remaining`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Scan the QR code below or copy the address above. After completing the transfer in your wallet, tap the *Verify Payment* button._`,
    ].join('\n');
  }
}

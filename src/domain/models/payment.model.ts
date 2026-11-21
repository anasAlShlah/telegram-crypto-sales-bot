export type CryptoNetwork = 'BEP20' | 'TRC20';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export type PaymentMethod = 'CRYPTO_USDT_BEP20' | 'CRYPTO_USDT_TRC20' | 'FIAT_CARD';

export interface CryptoPaymentInvoice {
  id: string; // e.g. INV-CRYPTO-xxxx
  orderId: string;
  userId: number;
  network: CryptoNetwork;
  token: 'USDT';
  destinationAddress: string;
  baseAmountUsd: number;
  microOffset: number; // e.g. 0.0021 for deterministic deposit matching
  exactAmount: number; // e.g. 50.0021 USDT
  status: PaymentStatus;
  txHash?: string;
  qrCodeDataUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface FiatPaymentInvoice {
  id: string; // e.g. INV-FIAT-xxxx
  orderId: string;
  userId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string;
  provider: 'MOCK_STRIPE' | 'WEBHOOK';
  createdAt: Date;
  paidAt?: Date;
}

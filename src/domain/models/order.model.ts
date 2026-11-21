import { CartItem } from './cart.model.js';
import { PaymentMethod, PaymentStatus } from './payment.model.js';

export type FulfillmentStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface ShippingDetails {
  fullName: string;
  streetAddress: string;
  city: string;
  stateOrRegion?: string;
  country: string;
  postalCode?: string;
  contactPhone?: string;
}

export interface CarrierTracking {
  carrier: string;
  trackingNumber: string;
  shippedAt: Date;
  estimatedDelivery?: string;
}

export interface Order {
  id: string; // Internal UUID
  trackingCode: string; // e.g. TRK-2026-X839
  userId: number; // Telegram User ID
  username?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingDetails?: ShippingDetails;
  carrierTracking?: CarrierTracking;
  cryptoInvoiceId?: string;
  fiatInvoiceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
}

export interface CartCalculation {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Cart {
  userId: number;
  items: CartItem[];
  couponCode?: string;
  calculation: CartCalculation;
  updatedAt: Date;
}

export interface CouponDiscount {
  code: string;
  percent: number;
  description: string;
  isActive: boolean;
}

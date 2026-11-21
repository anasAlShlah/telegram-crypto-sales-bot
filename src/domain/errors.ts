export class AppError extends Error {
  constructor(message: string, public code: string = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
  }
}

export class ProductNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Product with ID "${productId}" was not found.`, 'PRODUCT_NOT_FOUND');
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Insufficient inventory for "${productName}". Requested: ${requested}, Available: ${available}.`,
      'INSUFFICIENT_STOCK'
    );
  }
}

export class OrderNotFoundError extends AppError {
  constructor(orderIdOrTracking: string) {
    super(`Order "${orderIdOrTracking}" not found.`, 'ORDER_NOT_FOUND');
  }
}

export class PaymentInvoiceNotFoundError extends AppError {
  constructor(invoiceId: string) {
    super(`Invoice "${invoiceId}" not found.`, 'INVOICE_NOT_FOUND');
  }
}

export class UnauthorizedAdminError extends AppError {
  constructor(userId: number) {
    super(`User ID ${userId} is not authorized as an administrator.`, 'UNAUTHORIZED_ADMIN');
  }
}

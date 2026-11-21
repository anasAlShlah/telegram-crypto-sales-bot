import { Router, Request, Response } from 'express';
import { db } from '../database/memory-db.js';
import { CryptoGateway } from '../payments/crypto-gateway.js';
import { FiatGateway } from '../payments/fiat-gateway.js';
import { OrderService } from '../../application/services/order.service.js';

export const webhookRouter = Router();

// Health check endpoint
webhookRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'telegram-crypto-sales-bot',
    timestamp: new Date().toISOString(),
    stats: db.getStats(),
  });
});

// Public order tracking API
webhookRouter.get('/api/orders/:trackingCode', (req: Request, res: Response) => {
  const trackingCode = Array.isArray(req.params.trackingCode)
    ? req.params.trackingCode[0]
    : req.params.trackingCode;
  const order = OrderService.getOrderByTracking(trackingCode);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json({
    trackingCode: order.trackingCode,
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    stepper: OrderService.formatStepper(order.fulfillmentStatus),
    totalAmount: order.totalAmount,
    items: order.items,
    carrierTracking: order.carrierTracking,
    createdAt: order.createdAt,
  });
});

// Crypto payment webhook endpoint (called by blockchain watcher or manual trigger)
webhookRouter.post('/api/webhooks/crypto', async (req: Request, res: Response) => {
  const { invoiceId, txHash } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoiceId in payload' });
  }

  const result = await CryptoGateway.verifyPayment(invoiceId, txHash);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({
    status: 'SUCCESS',
    message: result.message,
    invoice: result.invoice,
  });
});

// Fiat payment webhook endpoint (simulates Stripe webhook)
webhookRouter.post('/api/webhooks/fiat', (req: Request, res: Response) => {
  const { invoiceId, cardNumber, expiry, cvc } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoiceId in payload' });
  }

  const result = FiatGateway.processPayment(invoiceId, { cardNumber, expiry, cvc });
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({
    status: 'SUCCESS',
    message: result.message,
    invoice: result.invoice,
  });
});

// Interactive HTML Mock Card Checkout Page
webhookRouter.get('/checkout/mock/:invoiceId', (req: Request, res: Response) => {
  const invoiceId = Array.isArray(req.params.invoiceId)
    ? req.params.invoiceId[0]
    : req.params.invoiceId;
  const invoice = db.getFiatInvoiceById(invoiceId);

  if (!invoice) {
    return res.status(404).send('<h1>Invoice Not Found</h1><p>The requested invoice does not exist.</p>');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mock Card Checkout | Telegram Crypto Sales Bot</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .price { font-size: 36px; font-weight: 800; color: #10b981; margin: 16px 0; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #fff; font-size: 15px; }
    input:focus { outline: none; border-color: #3b82f6; }
    .btn { width: 100%; padding: 14px; background: #10b981; color: #000; font-size: 16px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
    .btn:hover { background: #34d399; }
    .status-msg { margin-top: 16px; padding: 12px; border-radius: 8px; display: none; font-size: 14px; text-align: center; }
    .success { background: #065f46; color: #6ee7b7; border: 1px solid #047857; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Simulated Gateway</span>
      <h2>Secure Checkout Mock</h2>
      <p style="color: #94a3b8; font-size: 14px;">Invoice: <code>${invoice.id}</code></p>
      <div class="price">$${invoice.amount.toFixed(2)} USD</div>
    </div>
    <form id="checkoutForm">
      <div class="form-group">
        <label>Cardholder Name</label>
        <input type="text" value="Anas Al Shlah" required />
      </div>
      <div class="form-group">
        <label>Card Number (Simulated)</label>
        <input type="text" value="4242 •••• •••• 4242" required />
      </div>
      <div style="display: flex; gap: 12px;">
        <div class="form-group" style="flex: 1;">
          <label>Expiry</label>
          <input type="text" value="12/28" required />
        </div>
        <div class="form-group" style="flex: 1;">
          <label>CVC</label>
          <input type="text" value="888" required />
        </div>
      </div>
      <button type="submit" class="btn" id="payBtn">Authorize & Settle ($${invoice.amount.toFixed(2)})</button>
    </form>
    <div id="statusBox" class="status-msg"></div>
  </div>
  <script>
    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('payBtn');
      const statusBox = document.getElementById('statusBox');
      btn.disabled = true;
      btn.innerText = 'Processing simulated settlement...';

      try {
        const res = await fetch('/api/webhooks/fiat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: '${invoice.id}' })
        });
        const data = await res.json();
        if (data.status === 'SUCCESS') {
          statusBox.className = 'status-msg success';
          statusBox.innerHTML = '✅ <strong>Payment Approved!</strong><br>You can now return to the Telegram bot to track your order.';
          btn.style.display = 'none';
        } else {
          alert('Payment failed: ' + (data.message || 'Unknown error'));
          btn.disabled = false;
        }
      } catch (err) {
        alert('Request failed');
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
  `;

  return res.send(html);
});

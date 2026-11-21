import { Context, MiddlewareFn } from 'telegraf';
import { db } from '../../../infrastructure/database/memory-db.js';
import { AdminService } from '../../../application/services/admin.service.js';

export interface BotContext extends Context {
  state: {
    user?: ReturnType<typeof db.getOrCreateUser>;
    isAdmin?: boolean;
    session?: {
      waitingFor?: 'COUPON' | 'TRACKING_CODE' | 'BROADCAST_TEXT' | 'PRODUCT_STOCK' | 'PRODUCT_PRICE';
      selectedProductQty?: Record<string, number>;
      activeOrderId?: string;
    };
  };
}

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (ctx.from) {
    const user = db.getOrCreateUser(ctx.from.id, {
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    const isAdmin = AdminService.isAdmin(ctx.from.id);
    if (isAdmin) {
      user.role = 'admin';
    }

    ctx.state = ctx.state || {};
    ctx.state.user = user;
    ctx.state.isAdmin = isAdmin;
  }

  return next();
};

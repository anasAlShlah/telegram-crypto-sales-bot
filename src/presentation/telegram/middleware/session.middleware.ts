import { MiddlewareFn } from 'telegraf';
import { BotContext } from './auth.middleware.js';

const sessions = new Map<number, NonNullable<BotContext['state']['session']>>();

export const sessionMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (ctx.from) {
    let session = sessions.get(ctx.from.id);
    if (!session) {
      session = {
        selectedProductQty: {},
      };
      sessions.set(ctx.from.id, session);
    }
    ctx.state = ctx.state || {};
    ctx.state.session = session;
  }
  return next();
};

export function clearUserWaitingSession(userId: number): void {
  const session = sessions.get(userId);
  if (session) {
    session.waitingFor = undefined;
  }
}

import { BotContext } from '../middleware/auth.middleware.js';
import { CatalogService } from '../../../application/services/catalog.service.js';
import { CartService } from '../../../application/services/cart.service.js';
import { Product } from '../../../domain/models/catalog.model.js';
import { CartItem } from '../../../domain/models/cart.model.js';
import { Keyboards } from '../keyboards/inline-keyboards.js';

export class CatalogHandler {
  public static async handleCategoryMenu(ctx: BotContext): Promise<void> {
    const categories = CatalogService.getCategories();
    const message = [
      `🏷️ *PRODUCT CATEGORIES*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Select a category below to browse items and specifications:`,
    ].join('\n');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Keyboards.categoryList(categories),
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithMarkdown(message, Keyboards.categoryList(categories));
    }
  }

  public static async handleCategorySelection(ctx: BotContext, categoryId: string): Promise<void> {
    const category = CatalogService.getCategoryById(categoryId);
    if (!category) {
      await ctx.answerCbQuery('Category not found.');
      return;
    }

    const products = CatalogService.getProducts({ categoryId, inStockOnly: false });
    const message = [
      `${category.icon} *${category.name.toUpperCase()}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_${category.description}_`,
      ``,
      `Choose a product below to inspect details & configure quantity:`,
    ].join('\n');

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Keyboards.productList(products, categoryId),
    });
    await ctx.answerCbQuery();
  }

  public static async handleProductDetail(
    ctx: BotContext,
    productId: string,
    quantity: number = 1
  ): Promise<void> {
    const product = CatalogService.getProductById(productId);
    if (!product) {
      await ctx.answerCbQuery('Product not found.');
      return;
    }

    const message = CatalogService.formatProductCard(product);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Keyboards.productDetail(product, quantity),
    });
    await ctx.answerCbQuery();
  }

  public static async handleQuantityChange(
    ctx: BotContext,
    productId: string,
    delta: number,
    currentQty: number
  ): Promise<void> {
    const product = CatalogService.getProductById(productId);
    if (!product) {
      await ctx.answerCbQuery('Product not found.');
      return;
    }

    const nextQty = Math.max(1, Math.min(product.stock, currentQty + delta));
    if (nextQty === currentQty) {
      const notice = delta > 0 ? 'Maximum available stock reached.' : 'Quantity cannot be less than 1.';
      await ctx.answerCbQuery(notice);
      return;
    }

    const message = CatalogService.formatProductCard(product);
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Keyboards.productDetail(product, nextQty),
    });
    await ctx.answerCbQuery();
  }

  public static async handleAddToCart(
    ctx: BotContext,
    productId: string,
    quantity: number
  ): Promise<void> {
    if (!ctx.from) return;

    try {
      const cart = CartService.addItem(ctx.from.id, productId, quantity);
      const product = CatalogService.getProductById(productId);

      await ctx.answerCbQuery(
        `✅ Added ${quantity}x "${product?.name || 'Item'}" to your cart!`,
        { show_alert: false }
      );

      // Offer prompt to view cart or continue
      const confirmationMsg = [
        `🛒 *ITEM ADDED TO CART*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `*${quantity}x* ${product?.name}`,
        `Current Cart Total: *$${cart.calculation.total.toFixed(2)} USD* (${cart.items.reduce((s: number, i: CartItem) => s + i.quantity, 0)} items)`,
        ``,
        `Would you like to proceed to checkout or continue exploring?`,
      ].join('\n');

      await ctx.replyWithMarkdown(confirmationMsg, Keyboards.cartActions(cart));
    } catch (err: any) {
      await ctx.answerCbQuery(`❌ Error: ${err.message}`, { show_alert: true });
    }
  }

  public static async handleSearch(ctx: BotContext, query: string): Promise<void> {
    if (!query || query.trim().length === 0) {
      await ctx.replyWithMarkdown(
        '💡 *Search Catalog:* Please provide a query, for example:\n`/search wallet` or `/search node`'
      );
      return;
    }

    const products = CatalogService.getProducts({ searchQuery: query });

    if (products.length === 0) {
      await ctx.replyWithMarkdown(
        `🔍 No products found matching: "*${query}*".\nTry searching for "wallet", "plate", "hoodie", or "node".`,
        Keyboards.mainMenu(ctx.state.isAdmin)
      );
      return;
    }

    const header = [
      `🔍 *SEARCH RESULTS FOR "${query.toUpperCase()}"* (${products.length} found)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Select an item to view specifications:`,
    ].join('\n');

    const buttons = products.map((prod: Product) => [
      MarkupButton(prod),
    ]);
    buttons.push([
      { text: '⬅️ Back to Categories', callback_data: 'menu_catalog' },
      { text: '🛒 View Cart', callback_data: 'menu_cart' },
    ]);

    await ctx.replyWithMarkdown(header, {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }
}

function MarkupButton(prod: Product) {
  return {
    text: `${prod.name} — $${prod.priceUsd.toFixed(2)}`,
    callback_data: `prod_${prod.id}`,
  };
}

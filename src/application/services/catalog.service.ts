import { Category, Product, ProductFilter } from '../../domain/models/catalog.model.js';
import { db } from '../../infrastructure/database/memory-db.js';

export class CatalogService {
  public static getCategories(): Category[] {
    return db.getCategories();
  }

  public static getCategoryById(id: string): Category | undefined {
    return db.getCategoryById(id);
  }

  public static getProducts(filter?: ProductFilter): Product[] {
    return db.getProducts(filter);
  }

  public static getProductById(id: string): Product | undefined {
    return db.getProductById(id);
  }

  public static formatProductCard(product: Product): string {
    const stockBadge =
      product.stock > 10
        ? `🟢 *In Stock* (${product.stock} units)`
        : product.stock > 0
        ? `🟡 *Low Stock* (${product.stock} units left!)`
        : `🔴 *Sold Out*`;

    const tagList = product.tags && product.tags.length > 0
      ? `\n🏷️ _Tags:_ ${product.tags.map((t) => `#${t}`).join(' ')}`
      : '';

    return [
      `📦 *${product.name}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Price:* *$${product.priceUsd.toFixed(2)} USD* (~${product.priceUsd.toFixed(2)} USDT)`,
      `📊 *Inventory:* ${stockBadge}`,
      ``,
      `📝 *Description:*`,
      `${product.description}`,
      tagList,
    ].filter(Boolean).join('\n');
  }
}

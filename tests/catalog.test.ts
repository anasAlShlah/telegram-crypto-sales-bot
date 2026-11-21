import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/infrastructure/database/memory-db.js';
import { CatalogService } from '../src/application/services/catalog.service.js';

describe('CatalogService & Search Engine', () => {
  beforeEach(() => {
    db.resetToSeed();
  });

  it('should retrieve all categories and products', () => {
    const categories = CatalogService.getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(4);

    const products = CatalogService.getProducts();
    expect(products.length).toBeGreaterThanOrEqual(6);
  });

  it('should filter products by category', () => {
    const wallets = CatalogService.getProducts({ categoryId: 'cat-wallets' });
    expect(wallets.length).toBeGreaterThanOrEqual(2);
    expect(wallets.every((p) => p.categoryId === 'cat-wallets')).toBe(true);
  });

  it('should search products by query keywords', () => {
    const searchWallet = CatalogService.getProducts({ searchQuery: 'hardware' });
    expect(searchWallet.length).toBeGreaterThanOrEqual(1);
    expect(searchWallet[0].name).toContain('TitanShield');

    const searchTag = CatalogService.getProducts({ searchQuery: 'airgapped' });
    expect(searchTag.length).toBeGreaterThanOrEqual(1);

    const searchEmpty = CatalogService.getProducts({ searchQuery: 'xyznonexistent123' });
    expect(searchEmpty).toHaveLength(0);
  });

  it('should format a rich product card with stock badges', () => {
    const product = CatalogService.getProductById('prod-titan-key');
    expect(product).toBeDefined();

    const card = CatalogService.formatProductCard(product!);
    expect(card).toContain('TitanShield Pro Hardware Wallet');
    expect(card).toContain('Price:');
    expect(card).toContain('$149.00 USD');
    expect(card).toContain('In Stock');
  });
});

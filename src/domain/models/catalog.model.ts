export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceUsd: number;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
  tags?: string[];
}

export interface ProductFilter {
  categoryId?: string;
  searchQuery?: string;
  inStockOnly?: boolean;
}

// ABOUTME: TypeScript types for product data parsed from CSV.
// ABOUTME: Maps to Shopify product/variant structure.

export interface ProductVariant {
  sku: string;
  price: number;
  compareAtPrice?: number;
  inventoryQty: number;
  weight?: number;
  weightUnit?: 'lb' | 'kg' | 'oz' | 'g';
  imageUrl?: string;
  options: Record<string, string>;
}

export interface Product {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  type: string;
  tags: string[];
  variants: ProductVariant[];
}

export interface ProductParseResult {
  products: Product[];
  warnings: string[];
  errors: string[];
}

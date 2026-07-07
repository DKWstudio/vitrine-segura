import type { ProductSource } from "@/types/product";

export interface ProductSearchRule {
  source: ProductSource;
  category: string;
  query: string;
  min_price: number | null;
  max_price: number | null;
  min_rating: number | null;
  max_results: number;
}

export interface MarketplaceProduct {
  source: ProductSource;
  external_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  old_price: number | null;
  currency: string;
  image_url: string | null;
  product_url: string;
  affiliate_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  sold_count: number | null;
  seller_name: string | null;
  seller_reputation: string | null;
  score: number;
}

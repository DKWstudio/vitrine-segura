export type ProductSource = "mercadolivre" | "shopee" | "shein";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  category: 'Casa e Decora\u00e7\u00e3o' | 'Casa' | 'Eletr\u00f4nicos' | 'Beleza' | 'Audio' | 'Roupas-Masc' | 'Roupas-Fem' | 'Infantil' | 'Bebe' | 'Auto' | 'Suplementos';
  rating: number;
  benefits?: string[]; // Para as Dicas do Dia
  isDailyTip?: boolean;
}

export interface AffiliateProduct {
  id: string;
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
  is_active: boolean;
  is_featured: boolean;
  score: number;
  last_checked_at: string | null;
  created_at: string;
}

export interface SearchRule {
  id: string;
  source: ProductSource;
  category: string;
  query: string;
  min_price: number | null;
  max_price: number | null;
  min_rating: number | null;
  max_results: number;
  is_active: boolean;
  created_at: string;
}

export interface ClickSummary {
  product_id: string;
  title: string;
  source: ProductSource;
  clicks: number;
  clicks_last_7_days: number;
  is_featured: boolean;
}

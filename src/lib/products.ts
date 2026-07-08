import { products as localProducts } from "@/data/products";
import { createPublicSupabaseClient } from "@/lib/supabase/client";
import type { AffiliateProduct, Product } from "@/types/product";

export const productColumns = `
  id,
  source,
  external_id,
  title,
  description,
  category,
  price,
  old_price,
  currency,
  image_url,
  product_url,
  affiliate_url,
  rating,
  reviews_count,
  sold_count,
  seller_name,
  seller_reputation,
  is_active,
  is_featured,
  score,
  last_checked_at,
  created_at
`;

function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSupabaseProduct(product: Record<string, unknown>): AffiliateProduct {
  return {
    id: String(product.id),
    source: product.source === "shopee" ? "shopee" : "mercadolivre",
    external_id: String(product.external_id),
    title: String(product.title),
    description: product.description ? String(product.description) : null,
    category: String(product.category),
    price: toNumber(product.price as number | string | null) ?? 0,
    old_price: toNumber(product.old_price as number | string | null),
    currency: product.currency ? String(product.currency) : "BRL",
    image_url: product.image_url ? String(product.image_url) : null,
    product_url: String(product.product_url),
    affiliate_url: product.affiliate_url ? String(product.affiliate_url) : null,
    rating: toNumber(product.rating as number | string | null),
    reviews_count: product.reviews_count === null ? null : Number(product.reviews_count),
    sold_count: product.sold_count === null ? null : Number(product.sold_count),
    seller_name: product.seller_name ? String(product.seller_name) : null,
    seller_reputation: product.seller_reputation ? String(product.seller_reputation) : null,
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    score: toNumber(product.score as number | string | null) ?? 0,
    last_checked_at: product.last_checked_at ? String(product.last_checked_at) : null,
    created_at: String(product.created_at),
  };
}

function fromLocalProduct(product: Product): AffiliateProduct {
  return {
    id: product.id,
    source: "mercadolivre",
    external_id: product.id,
    title: product.name,
    description: null,
    category: product.category,
    price: product.price,
    old_price: null,
    currency: "BRL",
    image_url: product.image,
    product_url: product.url,
    affiliate_url: null,
    rating: product.rating,
    reviews_count: null,
    sold_count: null,
    seller_name: null,
    seller_reputation: null,
    is_active: true,
    is_featured: Boolean(product.isDailyTip),
    score: product.isDailyTip ? 100 : product.rating,
    last_checked_at: null,
    created_at: new Date(0).toISOString(),
  };
}

export async function getActiveProducts(): Promise<AffiliateProduct[]> {
  const fallbackProducts = localProducts.map(fromLocalProduct);
  const supabase = createPublicSupabaseClient();

  if (!supabase) {
    return fallbackProducts;
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select(productColumns)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(96);

    if (error) {
      console.warn("Could not load Supabase products. Using local fallback.", error.message);
      return fallbackProducts;
    }

    if (!data || data.length === 0) {
      return fallbackProducts;
    }

    return data.map((product) => normalizeSupabaseProduct(product));
  } catch (error) {
    console.warn(
      "Unexpected product loading error. Using local fallback.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return fallbackProducts;
  }
}
export async function getActiveProductById(id: string): Promise<AffiliateProduct | null> {
  const products = await getActiveProducts();
  return products.find((product) => product.id === id) || null;
}

export async function getRelatedProducts(product: AffiliateProduct, limit = 4): Promise<AffiliateProduct[]> {
  const products = await getActiveProducts();

  return products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, limit);
}


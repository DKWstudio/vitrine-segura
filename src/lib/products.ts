import { products as localProducts } from "@/data/products";
import { createPublicSupabaseClient } from "@/lib/supabase/client";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AffiliateProduct, Product, ProductSource } from "@/types/product";

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

function normalizeProductSource(value: unknown): ProductSource {
  return value === "shopee" || value === "shein" ? value : "mercadolivre";
}

export function normalizeSupabaseProduct(product: Record<string, unknown>): AffiliateProduct {
  return {
    id: String(product.id),
    source: normalizeProductSource(product.source),
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

export async function getActiveProducts(limit = 1000): Promise<AffiliateProduct[]> {
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
      .limit(limit);

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
  const supabase = createPublicSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(productColumns)
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.warn("Could not load Supabase product by id.", error.message);
      }

      if (data) {
        return normalizeSupabaseProduct(data);
      }
    } catch (error) {
      console.warn(
        "Unexpected product by id loading error.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  const fallbackProducts = localProducts.map(fromLocalProduct);
  return fallbackProducts.find((product) => product.id === id) || null;
}

export async function getRelatedProducts(product: AffiliateProduct, limit = 4): Promise<AffiliateProduct[]> {
  const products = await getActiveProducts();

  return products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, limit);
}

export async function getMostClickedProducts(limit = 8, days = 7): Promise<AffiliateProduct[]> {
  let supabase: ReturnType<typeof createServiceSupabaseClient>;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.warn(
      "Could not create Supabase service client for clicked products.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: clicks, error: clicksError } = await supabase
      .from("clicks")
      .select("product_id")
      .gte("created_at", since)
      .not("product_id", "is", null)
      .limit(2000);

    if (clicksError) {
      console.warn("Could not load clicked products.", clicksError.message);
      return [];
    }

    const clickCounts = new Map<string, number>();

    for (const click of clicks || []) {
      const productId = String(click.product_id || "");

      if (!productId) {
        continue;
      }

      clickCounts.set(productId, (clickCounts.get(productId) || 0) + 1);
    }

    const productIds = Array.from(clickCounts.keys());

    if (productIds.length === 0) {
      return [];
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(productColumns)
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      console.warn("Could not load most clicked product details.", productsError.message);
      return [];
    }

    return (products || [])
      .map((product) => normalizeSupabaseProduct(product))
      .sort((a, b) => (clickCounts.get(b.id) || 0) - (clickCounts.get(a.id) || 0))
      .slice(0, limit);
  } catch (error) {
    console.warn(
      "Unexpected most clicked product loading error.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}



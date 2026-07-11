import type { MarketplaceProduct } from "@/lib/adapters/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

function toSearchedProductRow(product: MarketplaceProduct, now: string) {
  return {
    source: product.source,
    external_id: product.external_id,
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price,
    old_price: product.old_price,
    currency: product.currency,
    image_url: product.image_url,
    product_url: product.product_url,
    affiliate_url: product.affiliate_url,
    rating: product.rating,
    reviews_count: product.reviews_count,
    sold_count: product.sold_count,
    seller_name: product.seller_name,
    seller_reputation: product.seller_reputation,
    is_active: false,
    score: product.score,
    last_checked_at: now,
  };
}

export async function saveSearchedProducts(products: MarketplaceProduct[], now = new Date().toISOString()) {
  if (products.length === 0) {
    return 0;
  }

  const supabase = createServiceSupabaseClient();
  const rows = products.map((product) => toSearchedProductRow(product, now));
  const externalIds = rows.map((row) => row.external_id);
  const sources = Array.from(new Set(rows.map((row) => row.source)));

  const { data: existingRows, error: existingError } = await supabase
    .from("products")
    .select("source, external_id, affiliate_url, is_active")
    .in("external_id", externalIds)
    .in("source", sources);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingMap = new Map(
    (existingRows || []).map((row) => [`${row.source}:${row.external_id}`, row]),
  );

  const curatedRows = rows.map((row) => {
    const key = `${row.source}:${row.external_id}`;
    const existing = existingMap.get(key);

    return {
      ...row,
      affiliate_url: row.affiliate_url || existing?.affiliate_url || null,
      is_active: existing ? Boolean(existing.is_active) : false,
    };
  });

  const { error } = await supabase.from("products").upsert(curatedRows, {
    onConflict: "source,external_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return curatedRows.length;
}

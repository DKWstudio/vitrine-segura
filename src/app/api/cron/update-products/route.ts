import { NextRequest, NextResponse } from "next/server";
import { searchProductsByRule } from "@/lib/adapters";
import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ProductSource } from "@/types/product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const staleAfterDays = 14;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRule(rule: Record<string, unknown>): ProductSearchRule {
  return {
    source: rule.source === "shopee" ? "shopee" : "mercadolivre",
    category: String(rule.category),
    query: String(rule.query),
    min_price: toNumber(rule.min_price),
    max_price: toNumber(rule.max_price),
    min_rating: toNumber(rule.min_rating),
    max_results: toNumber(rule.max_results) ?? 20,
  };
}

function toProductRow(product: MarketplaceProduct, now: string) {
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

async function preserveManualAffiliateUrls(products: MarketplaceProduct[]) {
  if (products.length === 0) {
    return products;
  }

  const supabase = createServiceSupabaseClient();
  const externalIds = products.map((product) => product.external_id);
  const sources = Array.from(new Set(products.map((product) => product.source)));

  const { data, error } = await supabase
    .from("products")
    .select("source, external_id, affiliate_url, is_featured")
    .in("external_id", externalIds)
    .in("source", sources);

  if (error || !data) {
    if (error) {
      console.warn("Could not load existing affiliate URLs.", error.message);
    }

    return products;
  }

  const existingMap = new Map(
    data.map((product) => [`${product.source}:${product.external_id}`, product]),
  );

  return products.map((product) => {
    const existing = existingMap.get(`${product.source}:${product.external_id}`);

    return {
      ...product,
      affiliate_url: product.affiliate_url || existing?.affiliate_url || null,
    };
  });
}

async function upsertProducts(products: MarketplaceProduct[], now: string) {
  if (products.length === 0) {
    return 0;
  }

  const supabase = createServiceSupabaseClient();
  const rows = products.map((product) => toProductRow(product, now));
  const externalIds = rows.map((row) => row.external_id);
  const sources = Array.from(new Set(rows.map((row) => row.source)));

  const { data: existingRows, error: existingError } = await supabase
    .from("products")
    .select("source, external_id, is_active")
    .in("external_id", externalIds)
    .in("source", sources);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingStatus = new Map(
    (existingRows || []).map((row) => [`${row.source}:${row.external_id}`, Boolean(row.is_active)]),
  );
  const curatedRows = rows.map((row) => {
    const key = `${row.source}:${row.external_id}`;

    return {
      ...row,
      is_active: existingStatus.has(key) ? Boolean(existingStatus.get(key)) : false,
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

async function deactivateStaleProducts(sources: ProductSource[], now: string) {
  if (sources.length === 0) {
    return 0;
  }

  const supabase = createServiceSupabaseClient();
  const cutoff = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false, last_checked_at: now })
    .in("source", sources)
    .lt("last_checked_at", cutoff)
    .eq("is_active", true)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length || 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  const now = new Date().toISOString();

  const { data: rulesData, error: rulesError } = await supabase
    .from("search_rules")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  const rules = (rulesData || []).map((rule) => normalizeRule(rule));
  const sourceSet = new Set<ProductSource>();
  let found = 0;
  let saved = 0;
  const errors: Array<{ rule: string; source: ProductSource; message: string }> = [];

  for (const rule of rules) {
    sourceSet.add(rule.source);

    try {
      const products = await searchProductsByRule(rule);
      const productsWithAffiliateUrls = await preserveManualAffiliateUrls(products);

      found += productsWithAffiliateUrls.length;
      saved += await upsertProducts(productsWithAffiliateUrls, now);
    } catch (error) {
      errors.push({
        rule: rule.query,
        source: rule.source,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  let deactivated = 0;

  try {
    deactivated = await deactivateStaleProducts(Array.from(sourceSet), now);
  } catch (error) {
    errors.push({
      rule: "deactivate-stale-products",
      source: "mercadolivre",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return NextResponse.json({
    ok: errors.length === 0,
    rules: rules.length,
    found,
    saved,
    deactivated,
    errors,
    checked_at: now,
  });
}

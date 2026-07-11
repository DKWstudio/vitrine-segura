import { NextRequest, NextResponse } from "next/server";
import { searchShopeeProducts } from "@/lib/adapters/shopee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") || "casa";

  try {
    const products = await searchShopeeProducts({
      source: "shopee",
      category: "Debug Shopee",
      query,
      min_price: null,
      max_price: null,
      min_rating: null,
      max_results: 3,
    });

    return NextResponse.json({
      env: {
        hasAppId: Boolean(process.env.SHOPEE_APP_ID),
        hasAppSecret: Boolean(process.env.SHOPEE_APP_SECRET),
        endpoint: process.env.SHOPEE_GRAPHQL_ENDPOINT || "https://open-api.affiliate.shopee.com.br/graphql",
      },
      query,
      count: products.length,
      sample: products.map((product) => ({
        external_id: product.external_id,
        title: product.title,
        price: product.price,
        rating: product.rating,
        sold_count: product.sold_count,
        product_url: product.product_url,
        has_affiliate_url: Boolean(product.affiliate_url),
        image_url: product.image_url,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        env: {
          hasAppId: Boolean(process.env.SHOPEE_APP_ID),
          hasAppSecret: Boolean(process.env.SHOPEE_APP_SECRET),
          endpoint: process.env.SHOPEE_GRAPHQL_ENDPOINT || "https://open-api.affiliate.shopee.com.br/graphql",
        },
        query,
        error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown Shopee API error",
      },
      { status: 500 },
    );
  }
}
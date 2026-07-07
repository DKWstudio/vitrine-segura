import { normalizeMarketplaceProduct } from "@/lib/adapters/normalization";
import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";

const mercadoLivreSearchUrl = "https://api.mercadolibre.com/sites/MLB/search";

interface MercadoLivreSearchResponse {
  results?: MercadoLivreItem[];
}

interface MercadoLivreItem {
  id?: string;
  title?: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  permalink?: string;
  sold_quantity?: number;
  seller?: {
    nickname?: string;
    seller_reputation?: {
      level_id?: string;
    };
  };
  reviews?: {
    rating_average?: number;
    total?: number;
  };
  rating_average?: number;
}

function getImageUrl(item: MercadoLivreItem) {
  const imageUrl = item.secure_thumbnail || item.thumbnail || null;

  if (!imageUrl) {
    return null;
  }

  return imageUrl.replace(/^http:\/\//, "https://");
}

function getRating(item: MercadoLivreItem) {
  if (typeof item.reviews?.rating_average === "number") {
    return item.reviews.rating_average;
  }

  if (typeof item.rating_average === "number") {
    return item.rating_average;
  }

  return null;
}

function getReviewsCount(item: MercadoLivreItem) {
  if (typeof item.reviews?.total === "number") {
    return item.reviews.total;
  }

  return null;
}

function normalizeMercadoLivreItem(
  item: MercadoLivreItem,
  rule: ProductSearchRule,
): MarketplaceProduct | null {
  if (!item.id || !item.title || typeof item.price !== "number" || !item.permalink) {
    return null;
  }

  return normalizeMarketplaceProduct({
    source: "mercadolivre",
    external_id: item.id,
    title: item.title,
    description: null,
    category: rule.category,
    price: item.price,
    old_price: typeof item.original_price === "number" ? item.original_price : null,
    currency: item.currency_id || "BRL",
    image_url: getImageUrl(item),
    product_url: item.permalink,
    affiliate_url: null,
    rating: getRating(item),
    reviews_count: getReviewsCount(item),
    sold_count: typeof item.sold_quantity === "number" ? item.sold_quantity : null,
    seller_name: item.seller?.nickname || null,
    seller_reputation: item.seller?.seller_reputation?.level_id || null,
  });
}

export async function searchMercadoLivreProducts(
  rule: ProductSearchRule,
): Promise<MarketplaceProduct[]> {
  const params = new URLSearchParams({
    q: rule.query,
    limit: String(Math.min(Math.max(rule.max_results || 20, 1), 50)),
  });

  const accessToken = process.env.MERCADO_LIVRE_ACCESS_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "VitrineSegura/1.0 (+https://vitrine-segura.vercel.app)",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${mercadoLivreSearchUrl}?${params.toString()}`, {
    headers: {
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const authHint =
      response.status === 403 && !accessToken
        ? " The public search endpoint was rejected without an access token. Configure MERCADO_LIVRE_ACCESS_TOKEN or test from the deployed Vercel environment."
        : "";

    throw new Error(
      `Mercado Livre search failed with status ${response.status}: ${errorBody.slice(0, 300)}${authHint}`,
    );
  }

  const payload = (await response.json()) as MercadoLivreSearchResponse;

  return (payload.results || [])
    .map((item) => normalizeMercadoLivreItem(item, rule))
    .filter((product): product is MarketplaceProduct => product !== null);
}

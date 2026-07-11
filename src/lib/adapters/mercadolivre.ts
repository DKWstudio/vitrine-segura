import { normalizeMarketplaceProduct } from "@/lib/adapters/normalization";
import {
  getMercadoLivreAccessToken,
  getMercadoLivreRefreshToken,
  refreshMercadoLivreAccessToken,
} from "@/lib/mercadolivre/auth";
import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";

const mercadoLivreSearchUrl = "https://api.mercadolibre.com/sites/MLB/search";
const mercadoLivreCatalogSearchUrl = "https://api.mercadolibre.com/products/search";

interface MercadoLivreSearchResponse {
  results?: MercadoLivreItem[];
}

interface MercadoLivreItem {
  id?: string;
  item_id?: string;
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

interface MercadoLivreCatalogSearchResponse {
  results?: MercadoLivreCatalogProduct[];
}

interface MercadoLivreCatalogItemsResponse {
  results?: MercadoLivreItem[];
  items?: MercadoLivreItem[];
}

interface MercadoLivreCatalogProduct {
  id?: string;
  catalog_product_id?: string;
  name?: string;
  title?: string;
  pictures?: Array<{ url?: string; secure_url?: string }>;
  main_picture?: string;
  permalink?: string;
  buy_box_winner?: MercadoLivreItem | null;
  price?: number;
  currency_id?: string;
  review?: {
    rating_average?: number;
    total?: number;
  };
  reviews?: {
    rating_average?: number;
    total?: number;
  };
}

function getImageUrl(item: MercadoLivreItem) {
  const imageUrl = item.secure_thumbnail || item.thumbnail || null;

  if (!imageUrl) {
    return null;
  }

  return imageUrl.replace(/^http:\/\//, "https://");
}

function getCatalogImageUrl(product: MercadoLivreCatalogProduct, winner?: MercadoLivreItem | null) {
  const imageUrl =
    winner?.secure_thumbnail ||
    winner?.thumbnail ||
    product.pictures?.[0]?.secure_url ||
    product.pictures?.[0]?.url ||
    product.main_picture ||
    null;

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

function getCatalogRating(product: MercadoLivreCatalogProduct, winner?: MercadoLivreItem | null) {
  if (winner) {
    return getRating(winner);
  }

  if (typeof product.reviews?.rating_average === "number") {
    return product.reviews.rating_average;
  }

  if (typeof product.review?.rating_average === "number") {
    return product.review.rating_average;
  }

  return null;
}

function getCatalogReviewsCount(product: MercadoLivreCatalogProduct) {
  if (typeof product.reviews?.total === "number") {
    return product.reviews.total;
  }

  if (typeof product.review?.total === "number") {
    return product.review.total;
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

function normalizeMercadoLivreCatalogProduct(
  product: MercadoLivreCatalogProduct,
  rule: ProductSearchRule,
): MarketplaceProduct | null {
  const winner = product.buy_box_winner || null;
  const winnerId = winner?.id || winner?.item_id;
  const externalId = winnerId || product.catalog_product_id || product.id;
  const title = winner?.title || product.name || product.title;
  const price = typeof winner?.price === "number" ? winner.price : product.price;
  const productUrl =
    winner?.permalink ||
    product.permalink ||
    (winnerId ? `https://produto.mercadolivre.com.br/${winnerId}` : null) ||
    (product.id ? `https://www.mercadolivre.com.br/p/${product.id}` : null);

  if (!externalId || !title || typeof price !== "number" || !productUrl) {
    return null;
  }

  return normalizeMarketplaceProduct({
    source: "mercadolivre",
    external_id: externalId,
    title,
    description: product.id ? `Catalogo Mercado Livre: ${product.id}` : "Catalogo Mercado Livre",
    category: rule.category,
    price,
    old_price: typeof winner?.original_price === "number" ? winner.original_price : null,
    currency: winner?.currency_id || product.currency_id || "BRL",
    image_url: getCatalogImageUrl(product, winner),
    product_url: productUrl,
    affiliate_url: null,
    rating: getCatalogRating(product, winner),
    reviews_count: getCatalogReviewsCount(product),
    sold_count: typeof winner?.sold_quantity === "number" ? winner.sold_quantity : null,
    seller_name: winner?.seller?.nickname || null,
    seller_reputation: winner?.seller?.seller_reputation?.level_id || null,
  });
}

function createHeaders(accessToken?: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "VitrineSegura/1.0 (+https://vitrine-segura.vercel.app)",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function requestMercadoLivre(requestUrl: string, accessToken?: string) {
  return fetch(requestUrl, {
    headers: createHeaders(accessToken),
    cache: "no-store",
  });
}

async function getFreshMercadoLivreToken() {
  if (!getMercadoLivreRefreshToken()) {
    return null;
  }

  const refreshed = await refreshMercadoLivreAccessToken();
  return refreshed?.access_token || null;
}

async function requestWithCurrentOrFreshToken(requestUrl: string) {
  const accessToken = getMercadoLivreAccessToken();
  let response = await requestMercadoLivre(requestUrl, accessToken);
  let refreshedToken: string | null = null;

  if ((response.status === 401 || response.status === 403) && getMercadoLivreRefreshToken()) {
    refreshedToken = await getFreshMercadoLivreToken();

    if (refreshedToken) {
      response = await requestMercadoLivre(requestUrl, refreshedToken);
    }
  }

  return { response, accessToken, refreshedToken };
}

async function searchMarketplaceProducts(rule: ProductSearchRule) {
  const params = new URLSearchParams({
    q: rule.query,
    limit: String(Math.min(Math.max(rule.max_results || 20, 1), 50)),
  });
  const requestUrl = `${mercadoLivreSearchUrl}?${params.toString()}`;
  const { response, accessToken, refreshedToken } = await requestWithCurrentOrFreshToken(requestUrl);

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      ok: false as const,
      status: response.status,
      body: errorBody,
      accessToken,
      refreshedToken,
      products: [] as MarketplaceProduct[],
    };
  }

  const payload = (await response.json()) as MercadoLivreSearchResponse;
  const products = (payload.results || [])
    .map((item) => normalizeMercadoLivreItem(item, rule))
    .filter((product): product is MarketplaceProduct => product !== null);

  return { ok: true as const, status: response.status, body: "", accessToken, refreshedToken, products };
}

function findCatalogItemWinner(payload: unknown): MercadoLivreItem | null {
  if (Array.isArray(payload)) {
    return payload.find((item): item is MercadoLivreItem => Boolean(item?.id && item?.permalink && typeof item?.price === "number")) || null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as MercadoLivreCatalogItemsResponse;
  const items = response.results || response.items || [];

  return items.find((item) => Boolean(item.id && item.permalink && typeof item.price === "number")) || null;
}

async function getCatalogItemWinner(catalogId: string, accessToken?: string) {
  try {
    const response = await requestMercadoLivre(`https://api.mercadolibre.com/products/${catalogId}/items?limit=5`, accessToken);

    if (!response.ok) {
      return null;
    }

    return findCatalogItemWinner(await response.json());
  } catch (error) {
    console.warn(
      `Could not load Mercado Livre catalog items ${catalogId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

async function getCatalogProductDetail(product: MercadoLivreCatalogProduct, accessToken?: string) {
  const catalogId = product.catalog_product_id || product.id;

  if (!catalogId) {
    return product;
  }

  let detail = product;

  try {
    const response = await requestMercadoLivre(`https://api.mercadolibre.com/products/${catalogId}`, accessToken);

    if (response.ok) {
      detail = {
        ...product,
        ...((await response.json()) as MercadoLivreCatalogProduct),
      };
    }
  } catch (error) {
    console.warn(
      `Could not load Mercado Livre catalog detail ${catalogId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const winner = detail.buy_box_winner || product.buy_box_winner || (await getCatalogItemWinner(catalogId, accessToken));

  return {
    ...detail,
    buy_box_winner: winner || null,
  };
}
async function searchCatalogProducts(rule: ProductSearchRule, tokenHint?: string | null) {
  const params = new URLSearchParams({
    site_id: "MLB",
    q: rule.query,
    limit: String(Math.min(Math.max(rule.max_results || 20, 1), 50)),
  });
  const requestUrl = `${mercadoLivreCatalogSearchUrl}?${params.toString()}`;
  const token = tokenHint || getMercadoLivreAccessToken() || (await getFreshMercadoLivreToken()) || undefined;
  let response = await requestMercadoLivre(requestUrl, token);
  let refreshedToken: string | null = null;

  if ((response.status === 401 || response.status === 403) && getMercadoLivreRefreshToken()) {
    refreshedToken = await getFreshMercadoLivreToken();

    if (refreshedToken) {
      response = await requestMercadoLivre(requestUrl, refreshedToken);
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Mercado Livre catalog search failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = (await response.json()) as MercadoLivreCatalogSearchResponse;
  const rawProducts = payload.results || [];
  const detailedProducts = await Promise.all(
    rawProducts.map((product) => getCatalogProductDetail(product, refreshedToken || token)),
  );
  const products = detailedProducts
    .map((product) => normalizeMercadoLivreCatalogProduct(product, rule))
    .filter((product): product is MarketplaceProduct => product !== null);

  if (rawProducts.length === 0) {
    throw new Error(`Mercado Livre catalog search returned 0 results for "${rule.query}".`);
  }

  if (products.length === 0) {
    throw new Error(
      `Mercado Livre catalog search returned ${rawProducts.length} results, but none had enough price/link data to save.`,
    );
  }

  return products;
}

export async function searchMercadoLivreProducts(
  rule: ProductSearchRule,
): Promise<MarketplaceProduct[]> {
  const marketplace = await searchMarketplaceProducts(rule);

  if (marketplace.ok) {
    return marketplace.products;
  }

  let catalogError = "";

  if (marketplace.status === 401 || marketplace.status === 403) {
    try {
      const catalogProducts = await searchCatalogProducts(rule, marketplace.refreshedToken || marketplace.accessToken);

      console.warn(
        `Mercado Livre marketplace search returned ${marketplace.status}; using catalog fallback with ${catalogProducts.length} products.`,
      );
      return catalogProducts;
    } catch (error) {
      catalogError = error instanceof Error ? ` Catalog fallback also failed: ${error.message}` : " Catalog fallback also failed.";
    }
  }

  const authHint =
    marketplace.status === 403 && !marketplace.accessToken
      ? " The public search endpoint was rejected without an access token. Configure MERCADO_LIVRE_ACCESS_TOKEN or test from the deployed Vercel environment."
      : "";
  const refreshHint =
    marketplace.refreshedToken && marketplace.status === 403
      ? " A refreshed access token was also rejected for marketplace search."
      : "";

  throw new Error(
    `Mercado Livre search failed with status ${marketplace.status}: ${marketplace.body.slice(0, 300)}${authHint}${refreshHint}${catalogError}`,
  );
}

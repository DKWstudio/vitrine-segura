import { createHash } from "crypto";
import { normalizeMarketplaceProduct } from "@/lib/adapters/normalization";
import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";

const defaultShopeeEndpoint = "https://open-api.affiliate.shopee.com.br/graphql";

type ShopeeProductOffer = {
  itemId?: string | number | null;
  productName?: string | null;
  price?: string | number | null;
  priceMin?: string | number | null;
  priceMax?: string | number | null;
  imageUrl?: string | null;
  productLink?: string | null;
  itemLink?: string | null;
  offerLink?: string | null;
  ratingStar?: string | number | null;
  sales?: string | number | null;
  shopName?: string | null;
  shopId?: string | number | null;
  commissionRate?: string | number | null;
};

type ShopeeGraphqlResponse = {
  data?: {
    productOfferV2?: {
      nodes?: ShopeeProductOffer[];
    };
  };
  errors?: Array<{ message?: string }>;
};

function getShopeeCredentials() {
  const appId = process.env.SHOPEE_APP_ID?.trim();
  const secret = process.env.SHOPEE_APP_SECRET?.trim();

  return {
    appId,
    secret,
    endpoint: process.env.SHOPEE_GRAPHQL_ENDPOINT?.trim() || defaultShopeeEndpoint,
  };
}

function hasShopeeCredentials() {
  const { appId, secret } = getShopeeCredentials();
  return Boolean(appId && secret);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/R\$/gi, "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: unknown) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function buildAuthorizationHeader(appId: string, secret: string, timestamp: number, payload: string) {
  const signature = createHash("sha256")
    .update(`${appId}${timestamp}${payload}${secret}`)
    .digest("hex");

  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

async function requestShopeeGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { appId, secret, endpoint } = getShopeeCredentials();

  if (!appId || !secret) {
    throw new Error("SHOPEE_APP_ID and SHOPEE_APP_SECRET are not configured.");
  }

  const payload = JSON.stringify({ query, variables });
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: buildAuthorizationHeader(appId, secret, timestamp, payload),
      "Content-Type": "application/json",
      Accept: "application/graphql-response+json, application/json",
    },
    body: payload,
    cache: "no-store",
  });
  const bodyText = await response.text();
  let body: ShopeeGraphqlResponse;

  try {
    body = JSON.parse(bodyText) as ShopeeGraphqlResponse;
  } catch {
    throw new Error(`Shopee API returned invalid JSON with status ${response.status}: ${bodyText.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`Shopee API failed with status ${response.status}: ${bodyText.slice(0, 500)}`);
  }

  if (body.errors?.length) {
    throw new Error(`Shopee API GraphQL error: ${body.errors.map((error) => error.message || "Unknown error").join("; ")}`);
  }

  return body as T;
}

function normalizeShopeeOffer(offer: ShopeeProductOffer, rule: ProductSearchRule): MarketplaceProduct | null {
  const itemId = offer.itemId === null || offer.itemId === undefined ? null : String(offer.itemId);
  const title = offer.productName?.trim();
  const productUrl = offer.productLink || offer.itemLink || null;
  const affiliateUrl = offer.offerLink || null;
  const priceMin = toNumber(offer.priceMin ?? offer.price);
  const priceMax = toNumber(offer.priceMax);

  if (!itemId || !title || !productUrl || priceMin === null || priceMin < 0) {
    return null;
  }

  return normalizeMarketplaceProduct({
    source: "shopee",
    external_id: `shopee-${itemId}`,
    title,
    description: null,
    category: rule.category,
    price: priceMin,
    old_price: priceMax !== null && priceMax > priceMin ? priceMax : null,
    currency: "BRL",
    image_url: offer.imageUrl || null,
    product_url: productUrl,
    affiliate_url: affiliateUrl,
    rating: toNumber(offer.ratingStar),
    reviews_count: null,
    sold_count: toInteger(offer.sales),
    seller_name: offer.shopName || null,
    seller_reputation: null,
  });
}

const productOfferQuery = `
  query VitrineSeguraShopeeProducts($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) {
      nodes {
        itemId
        productName
        priceMin
        priceMax
        imageUrl
        productLink
        offerLink
        ratingStar
        sales
        shopName
        shopId
        commissionRate
      }
      pageInfo {
        page
        limit
        hasNextPage
      }
    }
  }
`;

export async function searchShopeeProducts(rule: ProductSearchRule): Promise<MarketplaceProduct[]> {
  if (!hasShopeeCredentials()) {
    console.warn(
      `Shopee adapter skipped rule "${rule.query}": SHOPEE_APP_ID and SHOPEE_APP_SECRET are not configured.`,
    );
    return [];
  }

  const limit = Math.max(1, Math.min(rule.max_results || 20, 50));
  const variables = {
    keyword: rule.query,
    page: 1,
    limit,
    sortType: rule.query ? 1 : 2,
  };
  const response = await requestShopeeGraphql<ShopeeGraphqlResponse>(productOfferQuery, variables);
  const nodes = response.data?.productOfferV2?.nodes || [];

  return nodes
    .map((offer) => normalizeShopeeOffer(offer, rule))
    .filter((product): product is MarketplaceProduct => product !== null)
    .slice(0, limit);
}

import { getMercadoLivreAccessToken, refreshMercadoLivreAccessToken } from "@/lib/mercadolivre/auth";

const itemFilterPattern = /(?:item_id|itemId)[:=](MLB-?\d{8,})\b/i;
const itemQueryPattern = /[?&](?:item_id|itemId|id)=(MLB-?\d{8,})\b/i;
const itemPathPattern = /\/(?!p\/)(MLB-?\d{8,})(?:[/?#_-]|$)/i;
const itemFallbackPattern = /\b(MLB-?\d{9,})\b/i;

interface MercadoLivreItemDetail {
  id: string;
  title: string;
  price?: number;
  original_price?: number | null;
  currency_id?: string;
  permalink?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  pictures?: Array<{ secure_url?: string; url?: string }>;
  sold_quantity?: number;
  initial_quantity?: number;
  condition?: string;
  seller_id?: number;
  category_id?: string;
  seller_address?: {
    state?: { name?: string };
    city?: { name?: string };
  };
}

interface MercadoLivreUserDetail {
  id: number;
  nickname?: string;
  seller_reputation?: {
    level_id?: string;
  };
}

function createHeaders(accessToken?: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "VitrineSegura/1.0 (+https://vitrine-segura.vercel.app)",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function fetchMercadoLivreJson<T>(url: string, accessToken?: string): Promise<T> {
  let response = await fetch(url, {
    headers: createHeaders(accessToken),
    cache: "no-store",
  });

  if ((response.status === 401 || response.status === 403) && process.env.MERCADO_LIVRE_REFRESH_TOKEN) {
    const refreshed = await refreshMercadoLivreAccessToken();
    const refreshedToken = refreshed?.access_token;

    if (refreshedToken) {
      response = await fetch(url, {
        headers: createHeaders(refreshedToken),
        cache: "no-store",
      });
    }
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Livre request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

function normalizeMercadoLivreItemId(itemId?: string) {
  return itemId?.replace("-", "").toUpperCase() || null;
}

export function extractMercadoLivreItemId(input: string) {
  let decodedInput = input;

  try {
    decodedInput = decodeURIComponent(input);
  } catch {
    decodedInput = input;
  }

  const itemFilterMatch = decodedInput.match(itemFilterPattern);
  const itemQueryMatch = decodedInput.match(itemQueryPattern);
  const itemPathMatch = decodedInput.match(itemPathPattern);
  const fallbackMatch = decodedInput.match(itemFallbackPattern);

  return normalizeMercadoLivreItemId(
    itemFilterMatch?.[1] || itemQueryMatch?.[1] || itemPathMatch?.[1] || fallbackMatch?.[1],
  );
}

export async function getMercadoLivreItemById(itemId: string) {
  const accessToken = getMercadoLivreAccessToken();
  const item = await fetchMercadoLivreJson<MercadoLivreItemDetail>(
    `https://api.mercadolibre.com/items/${itemId}`,
    accessToken,
  );

  let seller: MercadoLivreUserDetail | null = null;

  if (item.seller_id) {
    try {
      seller = await fetchMercadoLivreJson<MercadoLivreUserDetail>(
        `https://api.mercadolibre.com/users/${item.seller_id}`,
        accessToken,
      );
    } catch (error) {
      console.warn(
        `Could not load Mercado Livre seller ${item.seller_id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const imageUrl =
    item.pictures?.[0]?.secure_url ||
    item.pictures?.[0]?.url ||
    item.secure_thumbnail ||
    item.thumbnail ||
    null;

  return {
    source: "mercadolivre" as const,
    external_id: item.id,
    title: item.title,
    description: item.condition ? `Condicao: ${item.condition}` : null,
    price: typeof item.price === "number" ? item.price : 0,
    old_price: typeof item.original_price === "number" ? item.original_price : null,
    currency: item.currency_id || "BRL",
    image_url: imageUrl ? imageUrl.replace(/^http:\/\//, "https://") : null,
    product_url: item.permalink || `https://produto.mercadolivre.com.br/${item.id}`,
    rating: null,
    reviews_count: null,
    sold_count: typeof item.sold_quantity === "number" ? item.sold_quantity : null,
    seller_name: seller?.nickname || null,
    seller_reputation: seller?.seller_reputation?.level_id || null,
  };
}






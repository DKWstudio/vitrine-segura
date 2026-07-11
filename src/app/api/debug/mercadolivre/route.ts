import { NextRequest, NextResponse } from "next/server";
import { searchMercadoLivreProducts } from "@/lib/adapters/mercadolivre";
import {
  getMercadoLivreAccessToken,
  getMercadoLivreAuthStatus,
  refreshMercadoLivreAccessToken,
} from "@/lib/mercadolivre/auth";

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

function createHeaders(accessToken?: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "VitrineSegura/1.0 (+https://vitrine-segura.vercel.app)",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function fetchStatus(url: string, accessToken?: string, includeBody = true) {
  const response = await fetch(url, {
    headers: createHeaders(accessToken),
    cache: "no-store",
  });

  const body = includeBody ? await response.text() : "";

  return {
    status: response.status,
    ok: response.ok,
    body: includeBody ? body.slice(0, 800) : undefined,
  };
}

async function fetchBoth(url: string, accessToken?: string) {
  const publicResponse = await fetchStatus(url);
  const tokenResponse = accessToken ? await fetchStatus(url, accessToken) : null;

  return {
    public: publicResponse,
    token: tokenResponse,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = getMercadoLivreAccessToken();
  const status = getMercadoLivreAuthStatus();
  const query = request.nextUrl.searchParams.get("q") || "suplementos";
  const encodedQuery = encodeURIComponent(query);
  const marketplaceSearchUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodedQuery}&limit=3`;
  const catalogSearchUrl = `https://api.mercadolibre.com/products/search?site_id=MLB&q=${encodedQuery}&limit=3`;

  const usersMe = accessToken
    ? await fetchStatus("https://api.mercadolibre.com/users/me", accessToken, false)
    : null;
  const sites = await fetchStatus("https://api.mercadolibre.com/sites/MLB", undefined, true);
  const categories = await fetchStatus("https://api.mercadolibre.com/sites/MLB/categories", undefined, true);
  const marketplaceSearch = await fetchBoth(marketplaceSearchUrl, accessToken);
  const catalogSearch = await fetchBoth(catalogSearchUrl, accessToken);

  let refresh: {
    ok: boolean;
    error?: string;
    hasNewAccessToken?: boolean;
    hasNewRefreshToken?: boolean;
    retried?: {
      users_me: Awaited<ReturnType<typeof fetchStatus>> | null;
      marketplace_search: Awaited<ReturnType<typeof fetchStatus>> | null;
      catalog_search: Awaited<ReturnType<typeof fetchStatus>> | null;
    };
  } | null = null;
  let catalogDetailProbe: Awaited<ReturnType<typeof fetchStatus>> | null = null;
  let adapterTest:
    | { ok: true; count: number; sample: Array<{ external_id: string; title: string; price: number; product_url: string; image_url: string | null }> }
    | { ok: false; error: string };

  try {
    const refreshed = await refreshMercadoLivreAccessToken();
    const refreshedToken = refreshed?.access_token;

    refresh = refreshed
      ? {
          ok: true,
          hasNewAccessToken: Boolean(refreshed.access_token),
          hasNewRefreshToken: Boolean(refreshed.refresh_token),
          retried: {
            users_me: refreshedToken
              ? await fetchStatus("https://api.mercadolibre.com/users/me", refreshedToken, false)
              : null,
            marketplace_search: refreshedToken
              ? await fetchStatus(marketplaceSearchUrl, refreshedToken)
              : null,
            catalog_search: refreshedToken ? await fetchStatus(catalogSearchUrl, refreshedToken) : null,
          },
        }
      : { ok: false, error: "Refresh token is not configured." };

    const catalogBody = refresh?.retried?.catalog_search?.body;

    if (refreshedToken && catalogBody) {
      try {
        const catalogPayload = JSON.parse(catalogBody) as { results?: Array<{ id?: string; catalog_product_id?: string }> };
        const catalogId = catalogPayload.results?.[0]?.catalog_product_id || catalogPayload.results?.[0]?.id;

        if (catalogId) {
          catalogDetailProbe = await fetchStatus(`https://api.mercadolibre.com/products/${catalogId}`, refreshedToken, true);
        }
      } catch {
        catalogDetailProbe = null;
      }
    }
  } catch (error) {
    refresh = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 800) : "Unknown refresh error",
    };
  }

  try {
    const products = await searchMercadoLivreProducts({
      source: "mercadolivre",
      category: "Debug",
      query,
      min_price: null,
      max_price: null,
      min_rating: null,
      max_results: 3,
    });

    adapterTest = {
      ok: true,
      count: products.length,
      sample: products.slice(0, 3).map((product) => ({
        external_id: product.external_id,
        title: product.title,
        price: product.price,
        product_url: product.product_url,
        image_url: product.image_url,
      })),
    };
  } catch (error) {
    adapterTest = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 1200) : "Unknown adapter error",
    };
  }

  return NextResponse.json({
    adapter_version: "ml-catalog-fallback-v5",
    env: status,
    query,
    users_me: usersMe,
    public_reference: {
      site: sites,
      categories,
    },
    marketplace_search: marketplaceSearch,
    catalog_search: catalogSearch,
    refresh,
    catalog_detail_probe: catalogDetailProbe,
    adapter_test: adapterTest,
    interpretation: {
      users_me_200_search_403:
        "OAuth esta valido, mas a app/conta/IP nao tem permissao para os endpoints de busca testados.",
      all_public_403: "Bloqueio acontece tambem sem token; precisa validacao/permissao no Mercado Livre.",
      catalog_200_marketplace_403: "Podemos adaptar a busca para catalogo, mas ela retorna produtos de catalogo, nao necessariamente ofertas/anuncios.",
    },
  });
}
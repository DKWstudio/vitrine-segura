import { NextRequest, NextResponse } from "next/server";
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
  } catch (error) {
    refresh = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 800) : "Unknown refresh error",
    };
  }

  return NextResponse.json({
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
    interpretation: {
      users_me_200_search_403:
        "OAuth esta valido, mas a app/conta/IP nao tem permissao para os endpoints de busca testados.",
      all_public_403: "Bloqueio acontece tambem sem token; precisa validacao/permissao no Mercado Livre.",
      catalog_200_marketplace_403: "Podemos adaptar a busca para catalogo, mas ela retorna produtos de catalogo, nao necessariamente ofertas/anuncios.",
    },
  });
}

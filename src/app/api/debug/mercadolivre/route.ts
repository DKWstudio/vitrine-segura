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

async function fetchStatus(url: string, accessToken?: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "User-Agent": "VitrineSegura/1.0 (+https://vitrine-segura.vercel.app)",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: "no-store",
  });

  const body = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    body: body.slice(0, 500),
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = getMercadoLivreAccessToken();
  const status = getMercadoLivreAuthStatus();
  const usersMe = accessToken
    ? await fetchStatus("https://api.mercadolibre.com/users/me", accessToken)
    : null;
  const search = await fetchStatus(
    "https://api.mercadolibre.com/sites/MLB/search?q=suplementos&limit=1",
    accessToken,
  );

  let refresh: {
    ok: boolean;
    error?: string;
    hasNewAccessToken?: boolean;
    hasNewRefreshToken?: boolean;
  } | null = null;

  try {
    const refreshed = await refreshMercadoLivreAccessToken();

    refresh = refreshed
      ? {
          ok: true,
          hasNewAccessToken: Boolean(refreshed.access_token),
          hasNewRefreshToken: Boolean(refreshed.refresh_token),
        }
      : { ok: false, error: "Refresh token is not configured." };
  } catch (error) {
    refresh = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown refresh error",
    };
  }

  return NextResponse.json({
    env: status,
    users_me: usersMe,
    search,
    refresh,
  });
}

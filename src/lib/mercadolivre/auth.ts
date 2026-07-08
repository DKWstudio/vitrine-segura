import { createHmac } from "crypto";
import { NextRequest } from "next/server";

const authorizationBaseUrl = "https://auth.mercadolivre.com.br/authorization";
const tokenUrl = "https://api.mercadolibre.com/oauth/token";

export interface MercadoLivreTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id?: number;
  refresh_token?: string;
}

export interface MercadoLivreAuthStatus {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}

function getClientId() {
  return process.env.MERCADO_LIVRE_CLIENT_ID || "";
}

function getClientSecret() {
  return process.env.MERCADO_LIVRE_CLIENT_SECRET || "";
}

export function getMercadoLivreAccessToken() {
  const token = process.env.MERCADO_LIVRE_ACCESS_TOKEN;
  return token && token !== "pending" ? token : "";
}

export function getMercadoLivreRefreshToken() {
  const token = process.env.MERCADO_LIVRE_REFRESH_TOKEN;
  return token && token !== "pending" ? token : "";
}

export function getMercadoLivreAuthStatus(): MercadoLivreAuthStatus {
  return {
    hasClientId: Boolean(getClientId()),
    hasClientSecret: Boolean(getClientSecret()),
    hasAccessToken: Boolean(getMercadoLivreAccessToken()),
    hasRefreshToken: Boolean(getMercadoLivreRefreshToken()),
  };
}

function getStateSecret() {
  return process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function getMercadoLivreRedirectUri(request: NextRequest) {
  return new URL("/api/auth/mercadolivre/callback", request.url).toString();
}

export function createMercadoLivreOAuthState() {
  const secret = getStateSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update("mercadolivre-oauth").digest("hex");
}

export function createMercadoLivreAuthorizationUrl(request: NextRequest) {
  const clientId = getClientId();
  const redirectUri = getMercadoLivreRedirectUri(request);
  const state = createMercadoLivreOAuthState();

  if (!clientId || !state) {
    throw new Error("Mercado Livre OAuth credentials are not configured.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return `${authorizationBaseUrl}?${params.toString()}`;
}

export async function exchangeMercadoLivreCodeForToken({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<MercadoLivreTokenResponse> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Mercado Livre client credentials are not configured.");
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Livre token exchange failed: ${response.status} ${body}`);
  }

  return (await response.json()) as MercadoLivreTokenResponse;
}

export async function refreshMercadoLivreAccessToken(): Promise<MercadoLivreTokenResponse | null> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = getMercadoLivreRefreshToken();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Livre token refresh failed: ${response.status} ${body}`);
  }

  const token = (await response.json()) as MercadoLivreTokenResponse;

  if (token.refresh_token && token.refresh_token !== refreshToken) {
    console.warn(
      "Mercado Livre returned a new refresh token. Update MERCADO_LIVRE_REFRESH_TOKEN in Vercel and .env.local.",
    );
  }

  return token;
}

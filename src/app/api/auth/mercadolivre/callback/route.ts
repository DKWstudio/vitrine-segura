import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  createMercadoLivreOAuthState,
  exchangeMercadoLivreCodeForToken,
  getMercadoLivreRedirectUri,
} from "@/lib/mercadolivre/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function html(content: string, status = 200) {
  return new NextResponse(content, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL("/admin", request.url), { status: 302 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = createMercadoLivreOAuthState();

  if (error) {
    return html(`<h1>Mercado Livre OAuth falhou</h1><pre>${escapeHtml(error)}</pre>`, 400);
  }

  if (!code || !state || state !== expectedState) {
    return html("<h1>Mercado Livre OAuth invalido</h1><p>Code ou state ausente/invalido.</p>", 400);
  }

  try {
    const token = await exchangeMercadoLivreCodeForToken({
      code,
      redirectUri: getMercadoLivreRedirectUri(request),
    });

    const refreshLine = token.refresh_token
      ? `MERCADO_LIVRE_REFRESH_TOKEN=${token.refresh_token}`
      : "MERCADO_LIVRE_REFRESH_TOKEN=";

    return html(`
      <main style="font-family: Arial, sans-serif; max-width: 920px; margin: 40px auto; padding: 24px;">
        <h1>Mercado Livre conectado</h1>
        <p>Copie estes valores para o seu <code>.env.local</code> e depois reinicie o servidor.</p>
        <pre style="white-space: pre-wrap; word-break: break-all; background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 12px;">MERCADO_LIVRE_ACCESS_TOKEN=${escapeHtml(token.access_token)}
${escapeHtml(refreshLine)}</pre>
        <p><strong>Expira em:</strong> ${escapeHtml(String(token.expires_in))} segundos</p>
        <p><a href="/admin">Voltar para o admin</a></p>
      </main>
    `);
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Erro desconhecido.";
    return html(`<h1>Erro ao trocar code por token</h1><pre>${escapeHtml(message)}</pre>`, 500);
  }
}

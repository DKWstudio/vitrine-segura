import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createMercadoLivreAuthorizationUrl } from "@/lib/mercadolivre/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL("/admin", request.url), { status: 302 });
  }

  try {
    return NextResponse.redirect(createMercadoLivreAuthorizationUrl(request), { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Mercado Livre OAuth.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

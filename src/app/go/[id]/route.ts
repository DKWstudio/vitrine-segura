import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallbackRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url), { status: 302 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return fallbackRedirect(request);
  }

  const supabase = createServiceSupabaseClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("id, source, product_url, affiliate_url, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !product || !product.is_active) {
    return fallbackRedirect(request);
  }

  const destinationUrl = product.affiliate_url || product.product_url;

  if (!destinationUrl) {
    return fallbackRedirect(request);
  }

  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  const { error: clickError } = await supabase.from("clicks").insert({
    product_id: product.id,
    source: product.source,
    user_agent: userAgent,
    referrer,
  });

  if (clickError) {
    console.warn(`Could not register click for product ${product.id}: ${clickError.message}`);
  }

  return NextResponse.redirect(destinationUrl, { status: 302 });
}

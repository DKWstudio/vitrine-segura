import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceSupabaseClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, source, campaign_url, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !campaign || !campaign.is_active) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await supabase.from("campaign_clicks").insert({
    campaign_id: campaign.id,
    source: campaign.source,
    user_agent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  });

  return NextResponse.redirect(campaign.campaign_url);
}
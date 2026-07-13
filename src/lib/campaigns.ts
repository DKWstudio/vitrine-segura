import { createPublicSupabaseClient } from "@/lib/supabase/client";
import type { Campaign, ProductSource } from "@/types/product";

export const campaignColumns = `
  id,
  source,
  title,
  description,
  coupon_code,
  campaign_url,
  image_url,
  is_active,
  is_featured,
  created_at
`;

function normalizeCampaignSource(value: unknown): ProductSource {
  return value === "shopee" || value === "shein" ? value : "mercadolivre";
}

export function normalizeSupabaseCampaign(campaign: Record<string, unknown>): Campaign {
  return {
    id: String(campaign.id),
    source: normalizeCampaignSource(campaign.source),
    title: String(campaign.title),
    description: campaign.description ? String(campaign.description) : null,
    coupon_code: campaign.coupon_code ? String(campaign.coupon_code) : null,
    campaign_url: String(campaign.campaign_url),
    image_url: campaign.image_url ? String(campaign.image_url) : null,
    is_active: Boolean(campaign.is_active),
    is_featured: Boolean(campaign.is_featured),
    created_at: String(campaign.created_at),
  };
}

export async function getActiveCampaigns(limit = 6): Promise<Campaign[]> {
  const supabase = createPublicSupabaseClient();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select(campaignColumns)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Could not load campaigns.", error.message);
      return [];
    }

    return (data || []).map((campaign) => normalizeSupabaseCampaign(campaign));
  } catch (error) {
    console.warn(
      "Unexpected campaign loading error.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}
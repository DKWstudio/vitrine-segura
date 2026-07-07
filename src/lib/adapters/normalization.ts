import type { MarketplaceProduct } from "@/lib/adapters/types";

const sellerReputationScores: Record<string, number> = {
  "5_green": 20,
  "4_light_green": 16,
  "3_yellow": 10,
  "2_orange": 5,
  "1_red": 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateProductScore({
  price,
  rating,
  sold_count,
  seller_reputation,
}: Pick<MarketplaceProduct, "price" | "rating" | "sold_count" | "seller_reputation">) {
  const ratingScore = rating ? clamp(rating, 0, 5) * 12 : 0;
  const soldScore = sold_count ? clamp(Math.log10(sold_count + 1) * 10, 0, 25) : 0;
  const reputationScore = seller_reputation ? sellerReputationScores[seller_reputation] ?? 8 : 8;
  const priceScore = price > 0 ? clamp(20 - Math.log10(price + 1) * 5, 0, 20) : 0;

  return Number((ratingScore + soldScore + reputationScore + priceScore).toFixed(3));
}

export function normalizeMarketplaceProduct(
  product: Omit<MarketplaceProduct, "score">,
): MarketplaceProduct {
  return {
    ...product,
    score: calculateProductScore(product),
  };
}

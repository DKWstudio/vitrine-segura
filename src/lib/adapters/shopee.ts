import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";

function hasShopeeCredentials() {
  return Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_APP_SECRET);
}

export async function searchShopeeProducts(
  rule: ProductSearchRule,
): Promise<MarketplaceProduct[]> {
  if (!hasShopeeCredentials()) {
    console.warn(
      `Shopee adapter skipped rule "${rule.query}": SHOPEE_APP_ID and SHOPEE_APP_SECRET are not configured.`,
    );
    return [];
  }

  console.warn(
    "Shopee credentials found, but the official affiliate API request is not configured yet. Returning no products.",
  );

  return [];
}

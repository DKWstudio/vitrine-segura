import { searchMercadoLivreProducts } from "@/lib/adapters/mercadolivre";
import { searchShopeeProducts } from "@/lib/adapters/shopee";
import type { MarketplaceProduct, ProductSearchRule } from "@/lib/adapters/types";

export function filterProductsByRule(
  products: MarketplaceProduct[],
  rule: ProductSearchRule,
): MarketplaceProduct[] {
  return products.filter((product) => {
    if (rule.min_price !== null && product.price < rule.min_price) {
      return false;
    }

    if (rule.max_price !== null && product.price > rule.max_price) {
      return false;
    }

    if (rule.min_rating !== null && (product.rating === null || product.rating < rule.min_rating)) {
      return false;
    }

    return true;
  });
}

export async function searchProductsByRule(rule: ProductSearchRule): Promise<MarketplaceProduct[]> {
  if (rule.source === "mercadolivre") {
    const products = await searchMercadoLivreProducts(rule);
    return filterProductsByRule(products, rule);
  }

  const products = await searchShopeeProducts(rule);
  return filterProductsByRule(products, rule);
}

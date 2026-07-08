import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, slugifyCategory } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts();
  const now = new Date();
  const categories = Array.from(new Set(products.map((product) => product.category)));

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/ofertas/ate-50"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/ofertas/ate-100"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...categories.map((category) => ({
      url: absoluteUrl(`/categoria/${slugifyCategory(category)}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/produto/${product.id}`),
      lastModified: product.last_checked_at || product.created_at || now,
      changeFrequency: "weekly" as const,
      priority: product.is_featured ? 0.8 : 0.6,
    })),
  ];
}

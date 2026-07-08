import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, slugifyCategory } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "daily" | "weekly";
  priority: number;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastModified(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function GET() {
  const now = new Date();
  const baseEntries: SitemapEntry[] = [
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
  ];

  try {
    const products = await getActiveProducts();
    const categories = Array.from(new Set(products.map((product) => product.category)));
    const categoryEntries: SitemapEntry[] = categories.map((category) => ({
      url: absoluteUrl(`/categoria/${slugifyCategory(category)}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    }));
    const productEntries: SitemapEntry[] = products.map((product) => ({
      url: absoluteUrl(`/produto/${product.id}`),
      lastModified: toLastModified(product.last_checked_at || product.created_at, now),
      changeFrequency: "weekly",
      priority: product.is_featured ? 0.8 : 0.6,
    }));

    return new Response(renderSitemap([...baseEntries, ...categoryEntries, ...productEntries]), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  } catch (error) {
    console.warn("Could not generate full sitemap. Returning base sitemap.", error);

    return new Response(renderSitemap(baseEntries), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=300",
      },
    });
  }
}

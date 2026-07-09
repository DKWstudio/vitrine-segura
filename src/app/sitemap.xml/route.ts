import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, slugifyCategory } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SitemapEntry = {
  url: string;
  lastModified: Date;
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

function formatSitemapDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${formatSitemapDate(entry.lastModified)}</lastmod>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function sitemapResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function GET() {
  const now = new Date();
  const baseEntries: SitemapEntry[] = [
    { url: absoluteUrl("/"), lastModified: now },
    { url: absoluteUrl("/mercadolivre"), lastModified: now },
    { url: absoluteUrl("/shopee"), lastModified: now },
    { url: absoluteUrl("/ofertas/ate-50"), lastModified: now },
    { url: absoluteUrl("/ofertas/ate-100"), lastModified: now },
  ];

  try {
    const products = await getActiveProducts();
    const categories = Array.from(new Set(products.map((product) => product.category)));
    const categoryEntries: SitemapEntry[] = categories.map((category) => ({
      url: absoluteUrl(`/categoria/${slugifyCategory(category)}`),
      lastModified: now,
    }));
    const productEntries: SitemapEntry[] = products.map((product) => ({
      url: absoluteUrl(`/produto/${product.id}`),
      lastModified: toLastModified(product.last_checked_at || product.created_at, now),
    }));

    return sitemapResponse(renderSitemap([...baseEntries, ...categoryEntries, ...productEntries]));
  } catch (error) {
    console.warn("Could not generate full sitemap. Returning base sitemap.", error);
    return sitemapResponse(renderSitemap(baseEntries));
  }
}

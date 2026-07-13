import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, slugifyCategory } from "@/lib/seo";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDateOnly(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function urlEntry(url: string, lastmod: string) {
  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
}

export async function GET() {
  const products = await getActiveProducts(1000);
  const today = new Date().toISOString().slice(0, 10);
  const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  const staticPaths = ["/", "/shopee", "/shein", "/mercadolivre", "/ofertas/ate-50", "/ofertas/ate-100"];

  const entries = [
    ...staticPaths.map((path) => urlEntry(absoluteUrl(path), today)),
    ...categories.map((category) => urlEntry(absoluteUrl(`/categoria/${slugifyCategory(category)}`), today)),
    ...products.map((product) =>
      urlEntry(absoluteUrl(`/produto/${product.id}`), toDateOnly(product.last_checked_at || product.created_at)),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 86400;

const paths = [
  "/",
  "/shopee",
  "/shein",
  "/mercadolivre",
  "/ofertas/ate-50",
  "/ofertas/ate-100",
  "/categoria/beleza",
  "/categoria/casa-e-decoracao",
  "/categoria/celulares-e-telefones",
  "/categoria/eletrodomesticos",
  "/categoria/eletronicos-audio-e-video",
  "/categoria/esportes-e-fitness",
  "/categoria/ferramentas",
  "/categoria/infantil",
  "/categoria/joias-relogios",
  "/categoria/vestuario-e-acessorios",
];

function urlEntry(path: string) {
  return `  <url>\n    <loc>${absoluteUrl(path)}</loc>\n  </url>`;
}

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(urlEntry).join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "X-Robots-Tag": "noarchive",
    },
  });
}

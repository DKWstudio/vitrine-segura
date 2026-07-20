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

export function GET() {
  const sitemap = `${paths.map((path) => absoluteUrl(path)).join("\n")}\n`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "X-Robots-Tag": "noarchive",
    },
  });
}
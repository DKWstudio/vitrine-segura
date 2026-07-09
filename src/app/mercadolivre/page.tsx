import type { Metadata } from "next";
import PublicProductCollection from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, defaultOgImage, defaultOgImageAlt, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achadinhos Mercado Livre",
  description: "Produtos afiliados do Mercado Livre selecionados pela Vitrine Segura.",
  alternates: {
    canonical: absoluteUrl("/mercadolivre"),
  },
  openGraph: {
    title: "Achadinhos Mercado Livre | Vitrine Segura",
    description: "Produtos do Mercado Livre com curadoria, categorias e links afiliados oficiais.",
    url: absoluteUrl("/mercadolivre"),
    siteName,
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: defaultOgImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Achadinhos Mercado Livre | Vitrine Segura",
    description: "Produtos do Mercado Livre com curadoria, categorias e links afiliados oficiais.",
    images: [defaultOgImage],
  },
};

export default async function MercadoLivrePage() {
  const allProducts = await getActiveProducts();
  const products = allProducts.filter((product) => product.source === "mercadolivre");

  return (
    <PublicProductCollection
      title="Achadinhos Mercado Livre"
      subtitle="Produtos Mercado Livre selecionados com busca, curadoria e links afiliados oficiais."
      products={products}
      allProducts={allProducts}
      basePath="/mercadolivre"
      selectedSource="mercadolivre"
      showSourceFilter={false}
    />
  );
}

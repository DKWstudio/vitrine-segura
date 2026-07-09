import type { Metadata } from "next";
import PublicProductCollection from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, defaultOgImage, defaultOgImageAlt, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achadinhos Shopee",
  description: "Produtos afiliados da Shopee selecionados pela Vitrine Segura.",
  alternates: {
    canonical: absoluteUrl("/shopee"),
  },
  openGraph: {
    title: "Achadinhos Shopee | Vitrine Segura",
    description: "Produtos da Shopee com curadoria, categorias e links afiliados oficiais.",
    url: absoluteUrl("/shopee"),
    siteName,
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: defaultOgImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Achadinhos Shopee | Vitrine Segura",
    description: "Produtos da Shopee com curadoria, categorias e links afiliados oficiais.",
    images: [defaultOgImage],
  },
};

export default async function ShopeePage() {
  const allProducts = await getActiveProducts();
  const products = allProducts.filter((product) => product.source === "shopee");

  return (
    <PublicProductCollection
      title="Achadinhos Shopee"
      subtitle="Produtos Shopee selecionados manualmente com links afiliados oficiais."
      products={products}
      allProducts={allProducts}
      basePath="/shopee"
      selectedSource="shopee"
      showSourceFilter={false}
    />
  );
}

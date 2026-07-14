import type { Metadata } from "next";
import PublicProductCollection, {
  filterProductsBySource,
  getSourceFromParam,
} from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, defaultOgImage, defaultOgImageAlt, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ofertas ate R$ 50",
  description: "Achadinhos e produtos afiliados com pre\u00E7o ate R$ 50.",
  alternates: {
    canonical: absoluteUrl("/ofertas/ate-50"),
  },
  openGraph: {
    title: "Ofertas ate R$ 50 | Vitrine Segura",
    description: "Produtos baratos selecionados no Mercado Livre, Shopee e Shein.",
    url: absoluteUrl("/ofertas/ate-50"),
    siteName,
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: defaultOgImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ofertas ate R$ 50 | Vitrine Segura",
    description: "Produtos baratos selecionados no Mercado Livre, Shopee e Shein.",
    images: [defaultOgImage],
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function OffersUpTo50Page({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const queryParams: PageSearchParams = searchParams ? await searchParams : {};
  const allProducts = await getActiveProducts();
  const selectedSource = getSourceFromParam(queryParams.source);
  const offerProducts = allProducts.filter((product) => product.price <= 50);
  const products = filterProductsBySource(offerProducts, selectedSource);

  return (
    <PublicProductCollection
      title="Ofertas ate R$ 50"
      subtitle="Produtos baratos para compras rapidas, separados por fonte e categoria."
      products={products}
      allProducts={allProducts}
      basePath="/ofertas/ate-50"
      selectedSource={selectedSource}
    />
  );
}

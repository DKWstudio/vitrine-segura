import type { Metadata } from "next";
import PublicProductCollection, {
  filterProductsBySource,
  getSourceFromParam,
} from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ofertas ate R$ 100",
  description: "Achadinhos e produtos afiliados com preco ate R$ 100.",
  alternates: {
    canonical: absoluteUrl("/ofertas/ate-100"),
  },
  openGraph: {
    title: "Ofertas ate R$ 100 | Vitrine Segura",
    description: "Produtos selecionados ate R$ 100 no Mercado Livre e Shopee.",
    url: absoluteUrl("/ofertas/ate-100"),
    siteName: "Vitrine Segura",
    type: "website",
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function OffersUpTo100Page({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const queryParams: PageSearchParams = searchParams ? await searchParams : {};
  const allProducts = await getActiveProducts();
  const selectedSource = getSourceFromParam(queryParams.source);
  const offerProducts = allProducts.filter((product) => product.price <= 100);
  const products = filterProductsBySource(offerProducts, selectedSource);

  return (
    <PublicProductCollection
      title="Ofertas ate R$ 100"
      subtitle="Achadinhos com preco ate R$ 100, com filtro por Mercado Livre ou Shopee."
      products={products}
      allProducts={allProducts}
      basePath="/ofertas/ate-100"
      selectedSource={selectedSource}
    />
  );
}

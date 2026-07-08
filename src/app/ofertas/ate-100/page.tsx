import PublicProductCollection, {
  filterProductsBySource,
  getSourceFromParam,
} from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

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

import { notFound } from "next/navigation";
import PublicProductCollection, {
  filterProductsBySource,
  getSourceFromParam,
  slugifyCategory,
} from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { slug } = await params;
  const queryParams: PageSearchParams = searchParams ? await searchParams : {};
  const allProducts = await getActiveProducts();
  const category = Array.from(new Set(allProducts.map((product) => product.category))).find(
    (item) => slugifyCategory(item) === slug,
  );

  if (!category) {
    notFound();
  }

  const selectedSource = getSourceFromParam(queryParams.source);
  const categoryProducts = allProducts.filter((product) => product.category === category);
  const products = filterProductsBySource(categoryProducts, selectedSource);

  return (
    <PublicProductCollection
      title={category}
      subtitle={`Achadinhos ativos na categoria ${category}. Filtre por Mercado Livre ou Shopee.`}
      products={products}
      allProducts={allProducts}
      basePath={`/categoria/${slug}`}
      selectedSource={selectedSource}
    />
  );
}

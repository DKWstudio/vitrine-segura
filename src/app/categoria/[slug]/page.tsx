import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicProductCollection, {
  filterProductsBySource,
  getSourceFromParam,
} from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl, slugifyCategory, truncateDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

async function getCategoryBySlug(slug: string) {
  const products = await getActiveProducts();
  const category = Array.from(new Set(products.map((product) => product.category))).find(
    (item) => slugifyCategory(item) === slug,
  );

  return { products, category };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Categoria nao encontrada | Vitrine Segura",
    };
  }

  const title = `${category} | Vitrine Segura`;
  const description = truncateDescription(`Achadinhos e ofertas em ${category} no Mercado Livre e Shopee.`);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/categoria/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/categoria/${slug}`),
      siteName: "Vitrine Segura",
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { slug } = await params;
  const queryParams: PageSearchParams = searchParams ? await searchParams : {};
  const { products: allProducts, category } = await getCategoryBySlug(slug);

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

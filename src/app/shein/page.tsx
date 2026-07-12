import type { Metadata } from "next";
import PublicProductCollection, { filterProductsBySource, getSourceFromParam } from "@/components/ui/PublicProductCollection";
import { getActiveProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Achadinhos Shein | Vitrine Segura",
  description: "Curadoria de achadinhos Shein cadastrados manualmente com links oficiais.",
  alternates: {
    canonical: absoluteUrl("/shein"),
  },
  openGraph: {
    title: "Achadinhos Shein | Vitrine Segura",
    description: "Curadoria de achadinhos Shein na Vitrine Segura.",
    url: absoluteUrl("/shein"),
  },
};

export default async function SheinPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedSource = getSourceFromParam(params.source) === "all" ? "shein" : getSourceFromParam(params.source);
  const allProducts = await getActiveProducts();
  const products = filterProductsBySource(allProducts, selectedSource);

  return (
    <PublicProductCollection
      title="Achadinhos Shein"
      subtitle="Curadoria manual com links oficiais e produtos selecionados."
      products={products}
      allProducts={allProducts}
      basePath="/shein"
      selectedSource={selectedSource}
      showSourceFilter={false}
    />
  );
}
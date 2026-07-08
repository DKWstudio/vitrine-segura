import Link from "next/link";
import ProductGrid from "@/components/ui/ProductGrid";
import type { AffiliateProduct, ProductSource } from "@/types/product";

const sourceOptions: Array<{ id: "all" | ProductSource; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "mercadolivre", label: "Mercado Livre" },
  { id: "shopee", label: "Shopee" },
];

interface PublicProductCollectionProps {
  title: string;
  subtitle: string;
  products: AffiliateProduct[];
  allProducts: AffiliateProduct[];
  basePath: string;
  selectedSource: "all" | ProductSource;
}

export function slugifyCategory(category: string) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSourceFromParam(value: string | string[] | undefined): "all" | ProductSource {
  const source = Array.isArray(value) ? value[0] : value;

  if (source === "mercadolivre" || source === "shopee") {
    return source;
  }

  return "all";
}

export function filterProductsBySource(products: AffiliateProduct[], source: "all" | ProductSource) {
  return source === "all" ? products : products.filter((product) => product.source === source);
}

function getSourceHref(basePath: string, source: "all" | ProductSource) {
  return source === "all" ? basePath : `${basePath}?source=${source}`;
}

export default function PublicProductCollection({
  title,
  subtitle,
  products,
  allProducts,
  basePath,
  selectedSource,
}: PublicProductCollectionProps) {
  const categories = Array.from(new Set(allProducts.map((product) => product.category))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-[1200px] space-y-8">
        <header className="rounded-2xl bg-slate-950 p-6 text-white">
          <Link href="/" className="text-xs font-black uppercase tracking-[0.25em] text-[#FFE600]">
            Vitrine Segura
          </Link>
          <h1 className="mt-3 text-3xl font-black uppercase md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-300 md:text-base">{subtitle}</p>
        </header>

        <nav className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ofertas/ate-50"
              className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase text-green-700"
            >
              Ate R$ 50
            </Link>
            <Link
              href="/ofertas/ate-100"
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase text-blue-700"
            >
              Ate R$ 100
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-600"
            >
              Home
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fonte:</span>
            {sourceOptions.map((source) => (
              <Link
                key={source.id}
                href={getSourceHref(basePath, source.id)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedSource === source.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {source.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/categoria/${slugifyCategory(category)}`}
                className="flex-shrink-0 rounded-xl border-2 border-slate-950 bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:border-[#FFE600] hover:bg-[#FFE600] hover:text-slate-950"
              >
                {category}
              </Link>
            ))}
          </div>
        </nav>

        <section>
          <ProductGrid products={products} />
        </section>
      </section>
    </main>
  );
}

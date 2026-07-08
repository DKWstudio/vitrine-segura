import Link from "next/link";
import { CheckCircle, Shield, Star, Truck } from "lucide-react";
import ProductGrid from "@/components/ui/ProductGrid";
import { slugifyCategory } from "@/lib/seo";
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

function TrustCards() {
  const items = [
    { icon: Star, text: "4.5+ Estrelas" },
    { icon: Truck, text: "Envio Full" },
    { icon: Shield, text: "Compra Segura" },
    { icon: CheckCircle, text: "Link Oficial" },
  ];

  return (
    <section className="relative z-20 -mt-12 container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {items.map((item) => (
          <div
            key={item.text}
            className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center transition-all hover:translate-y-[-4px]"
          >
            <item.icon className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      <header className="relative overflow-hidden bg-[#0F172A] pb-24 pt-16 text-center">
        <div className="container relative z-10 mx-auto px-4">
          <Link href="/" className="mb-6 inline-block rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <img
              src="/img/vitrineSegura.png"
              alt="Vitrine Segura"
              className="h-auto w-full max-w-[220px] md:max-w-[420px]"
            />
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white md:text-7xl">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium italic text-slate-400 md:text-xl">
            {subtitle}
          </p>
        </div>
      </header>

      <TrustCards />

      <nav className="sticky top-0 z-50 mt-8 border-b border-slate-200 bg-white/95 py-5 shadow-sm backdrop-blur-md">
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ofertas:</span>
            <Link
              href="/ofertas/ate-50"
              className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-green-700"
            >
              Ate R$ 50
            </Link>
            <Link
              href="/ofertas/ate-100"
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700"
            >
              Ate R$ 100
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-[#FFE600]"
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

          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/categoria/${slugifyCategory(category)}`}
                className="flex-shrink-0 rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-6 py-3 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:border-[#FFE600] hover:bg-[#FFE600] hover:text-[#0F172A]"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-[1200px] px-4 py-8">
        <ProductGrid products={products} />
      </main>
    </div>
  );
}


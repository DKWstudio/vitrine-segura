import Link from "next/link";
import { CheckCircle, Shield, Star, Truck } from "lucide-react";
import ProductGrid from "@/components/ui/ProductGrid";
import { slugifyCategory } from "@/lib/seo";
import type { AffiliateProduct, ProductSource } from "@/types/product";

const sourceOptions: Array<{ id: "all" | ProductSource; label: string }> = [
  { id: "all", label: "Todos" },
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
  showSourceFilter?: boolean;
}

export function getSourceFromParam(value: string | string[] | undefined): "all" | ProductSource {
  const source = Array.isArray(value) ? value[0] : value;

  if (source === "mercadolivre" || source === "shopee" || source === "shein") {
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

function getCategoryHref(category: string, source: "all" | ProductSource) {
  const path = `/categoria/${slugifyCategory(category)}`;
  return source === "all" ? path : `${path}?source=${source}`;
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
  showSourceFilter = true,
}: PublicProductCollectionProps) {
  const categoryProducts = selectedSource === "all"
    ? allProducts
    : allProducts.filter((product) => product.source === selectedSource);
  const categories = Array.from(new Set(categoryProducts.map((product) => product.category))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  const sourceLinks = showSourceFilter
    ? sourceOptions.map((source) => ({
        href: getSourceHref(basePath, source.id),
        label: source.label,
        active: selectedSource === source.id,
        className: "text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
      }))
    : [
        { href: "/", label: "Todos", active: false, className: "text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" },
        { href: "/mercadolivre", label: "Mercado Livre", active: selectedSource === "mercadolivre", className: "text-blue-700 hover:border-blue-200 hover:bg-blue-50" },
        { href: "/shopee", label: "Shopee", active: selectedSource === "shopee", className: "text-orange-700 hover:border-orange-200 hover:bg-orange-50" },
        { href: "/shein", label: "Shein", active: selectedSource === "shein", className: "text-pink-700 hover:border-pink-200 hover:bg-pink-50" },
      ];


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

      <nav className="relative z-10 mt-8 border-b border-slate-200 bg-white/95 py-5 shadow-sm backdrop-blur-md">
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:flex-wrap md:overflow-visible">
            {sourceLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                scroll={false}
                className={`flex-shrink-0 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition md:flex-shrink ${
                  link.active
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : `border-transparent ${link.className}`
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:gap-2.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {categories.map((category) => (
              <Link
                key={category}
                href={getCategoryHref(category, selectedSource)}
                scroll={false}
                className="flex-shrink-0 whitespace-nowrap rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wide text-white transition-all hover:border-[#FFE600] hover:bg-[#FFE600] hover:text-[#0F172A] sm:px-4 sm:text-[10px] md:flex-shrink lg:px-5"
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




"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import CategoryFilter from "@/components/ui/CategoryFilter";
import ProductGrid from "@/components/ui/ProductGrid";
import type { AffiliateProduct, ProductSource } from "@/types/product";

interface ProductCatalogProps {
  products: AffiliateProduct[];
}

const sourceOptions: Array<{ id: "all" | ProductSource; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "mercadolivre", label: "Mercado Livre" },
  { id: "shopee", label: "Shopee" },
];

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map((product) => product.category)));
    return uniqueCategories.length > 0 ? uniqueCategories : ["Casa"];
  }, [products]);

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedSource, setSelectedSource] = useState<"all" | ProductSource>("all");

  const filteredProducts = products.filter((product) => {
    const matchesCategory = product.category === selectedCategory;
    const matchesSource = selectedSource === "all" || product.source === selectedSource;

    return matchesCategory && matchesSource;
  });

  return (
    <>
      <nav className="sticky top-0 z-50 mt-8 border-b border-slate-200 bg-white/95 py-5 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="mb-3 flex items-center justify-between md:hidden">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Navegar por:
            </span>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1">
              <span className="animate-pulse text-[9px] font-black uppercase text-slate-500">
                Arraste
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Fonte:
            </span>
            {sourceOptions.map((source) => (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedSource === source.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Paginas:
            </span>
            <Link
              href="/mercadolivre"
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700"
            >
              Mercado Livre
            </Link>
            <Link
              href="/shopee"
              className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-orange-700"
            >
              Shopee
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Ofertas:
            </span>
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
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-[1200px] px-4 py-8">
        <ProductGrid products={filteredProducts} />
      </main>
    </>
  );
}



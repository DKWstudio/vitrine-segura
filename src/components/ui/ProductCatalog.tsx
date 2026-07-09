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

const quickLinks = [
  { href: "/mercadolivre", label: "Mercado Livre", className: "text-blue-700 hover:border-blue-200 hover:bg-blue-50" },
  { href: "/shopee", label: "Shopee", className: "text-orange-700 hover:border-orange-200 hover:bg-orange-50" },
  { href: "/ofertas/ate-50", label: "Ate R$ 50", className: "text-green-700 hover:border-green-200 hover:bg-green-50" },
  { href: "/ofertas/ate-100", label: "Ate R$ 100", className: "text-blue-700 hover:border-blue-200 hover:bg-blue-50" },
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
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex items-center justify-between md:hidden">
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm">
              {sourceOptions.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source.id)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    selectedSource === source.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  scroll={false}
                  className={`flex-shrink-0 rounded-lg border border-transparent px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${link.className}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-[1200px] px-4 py-8">
        <ProductGrid products={filteredProducts} />
      </main>
    </>
  );
}

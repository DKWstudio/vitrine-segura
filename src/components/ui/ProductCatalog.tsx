"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import CategoryFilter from "@/components/ui/CategoryFilter";
import ProductGrid from "@/components/ui/ProductGrid";
import SourceBadge from "@/components/ui/SourceBadge";
import type { AffiliateProduct, ProductSource } from "@/types/product";

interface ProductCatalogProps {
  products: AffiliateProduct[];
  mostClickedProducts?: AffiliateProduct[];
}

const sourceOptions: Array<{ id: "all" | ProductSource; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "mercadolivre", label: "Mercado Livre" },
  { id: "shopee", label: "Shopee" },
  { id: "shein", label: "Shein" },
];

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MostClickedStrip({ products }: { products: AffiliateProduct[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Mais clicados</p>
          <p className="text-xs font-semibold text-slate-500">Destaques dos últimos 7 dias</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-500 shadow-sm">
          Top {Math.min(products.length, 6)}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {products.slice(0, 6).map((product) => (
          <Link
            key={product.id}
            href={`/produto/${product.id}`}
            scroll={false}
            className="group flex min-w-[220px] max-w-[220px] gap-3 rounded-xl border border-slate-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="h-full w-full object-contain" />
              ) : (
                <ShoppingBag className="h-7 w-7 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1">
                <SourceBadge source={product.source} />
              </div>
              <p className="line-clamp-2 text-xs font-black leading-snug text-slate-900 group-hover:text-blue-700">
                {product.title}
              </p>
              <p className="mt-1 text-xs font-black text-slate-950">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function ProductCatalog({ products, mostClickedProducts = [] }: ProductCatalogProps) {
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
      <nav className="relative z-10 mt-8 border-b border-slate-200 bg-white/95 py-5 shadow-sm backdrop-blur-md">
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

          <div className="flex flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {sourceOptions.map((source) => (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`flex-shrink-0 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedSource === source.id
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-transparent text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>

          <MostClickedStrip products={mostClickedProducts} />
        </div>
      </nav>

      <main className="container mx-auto max-w-[1200px] px-4 py-8">
        <ProductGrid products={filteredProducts} />
      </main>
    </>
  );
}


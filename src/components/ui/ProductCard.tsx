"use client";

import { Star, Flame, ArrowRight } from "lucide-react";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const getUtmUrl = (baseUrl: string, category: string) => {
    const cleanCategory = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}utm_source=vitrine&utm_medium=site&utm_content=${cleanCategory}`;
  };

  const finalUrl = getUtmUrl(product.url, product.category);

  return (
    <div className={`group relative bg-white rounded-3xl transition-all duration-500 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 ${product.isDailyTip ? "border-amber-400 ring-1 ring-amber-400" : ""}`}>
      {product.isDailyTip && (
        <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg uppercase animate-bounce">
          <Flame className="h-3 w-3 fill-white" /> Top
        </div>
      )}
      <div className="relative aspect-square bg-slate-50 rounded-t-3xl overflow-hidden">
        <img src={product.image} alt={product.name} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform" />
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-[10px] font-bold">{product.rating}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="text-[11px] md:text-sm font-bold text-slate-800 line-clamp-2 h-8 leading-tight">{product.name}</h3>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">A partir de</span>
          <span className="text-lg font-black text-slate-900">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <a href={finalUrl} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black text-[9px] uppercase tracking-tighter transition-all ${product.isDailyTip ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "bg-blue-600 text-white shadow-lg shadow-blue-100"}`}>
          <span className="text-center leading-none">Ver no Mercado Livre</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
        </a>
      </div>
    </div>
  );
}
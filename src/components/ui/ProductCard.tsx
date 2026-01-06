// BUILD UPDATE: 06/01/2026 - v2.1
"use client";

import { Star, Flame, ArrowRight } from "lucide-react";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // FUNÇÃO PARA GERAR A URL COM UTM DINÂMICA
  const getUtmUrl = (baseUrl: string, category: string) => {
    const cleanCategory = category
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}utm_source=vitrine&utm_medium=site&utm_content=${cleanCategory}`;
  };

  const finalUrl = getUtmUrl(product.url, product.category);

  return (
    <div 
      className={`group relative bg-white rounded-3xl transition-all duration-500 hover:-translate-y-2 
        ${product.isDailyTip 
          ? "border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]" 
          : "border border-slate-100 shadow-sm hover:shadow-xl"
        }`}
    >
      {/* SELO DE MAIS VENDIDO */}
      {product.isDailyTip && (
        <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-tighter animate-bounce">
          <Flame className="h-3 w-3 fill-white" />
          Destaque
        </div>
      )}

      {/* IMAGEM DO PRODUTO */}
      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-slate-50">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-slate-100">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-[11px] font-bold text-slate-700">{product.rating}</span>
        </div>
      </div>

      {/* DETALHES DO PRODUTO */}
      <div className="p-5 space-y-3">
        <h3 className="text-[12px] md:text-sm font-bold text-slate-800 line-clamp-2 h-10 leading-snug group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">A partir de</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-900">R$</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* BOTÃO DE AÇÃO COM GRADIENTE PARA MAIOR DESTAQUE */}
        <a
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all active:scale-95 shadow-lg
            ${product.isDailyTip 
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-100" 
              : "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-blue-100"
            }`}
        >
          <span className="text-center">Ver no Mercado Livre</span>
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
        
        <p className="text-[9px] text-center text-slate-400 font-medium">
          Envio Full • Compra Garantida
        </p>
      </div>
    </div>
  );
}
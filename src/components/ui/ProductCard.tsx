"use client";

import { ArrowRight, Flame, ShoppingBag } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import RatingStars from "@/components/ui/RatingStars";
import SourceBadge from "@/components/ui/SourceBadge";
import type { AffiliateProduct } from "@/types/product";

interface ProductCardProps {
  product: AffiliateProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const sourceLabel = product.source === "shopee" ? "Shopee" : "Mercado Livre";
  const outboundUrl = `/go/${product.id}`;

  return (
    <div
      className={`group relative bg-white rounded-3xl transition-all duration-500 hover:-translate-y-2 ${
        product.is_featured
          ? "border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
          : "border border-slate-100 shadow-sm hover:shadow-xl"
      }`}
    >
      {product.is_featured ? (
        <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-tighter animate-bounce">
          <Flame className="h-3 w-3 fill-white" />
          Destaque
        </div>
      ) : null}

      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-slate-50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ShoppingBag className="h-16 w-16" />
          </div>
        )}
        <RatingStars rating={product.rating} />
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SourceBadge source={product.source} />
          <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {product.category}
          </span>
        </div>

        <h3 className="text-[12px] md:text-sm font-bold text-slate-800 line-clamp-2 h-10 leading-snug group-hover:text-blue-600 transition-colors">
          {product.title}
        </h3>

        <PriceTag price={product.price} oldPrice={product.old_price} />

        <a
          href={outboundUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all active:scale-95 shadow-lg ${
            product.is_featured
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-100"
              : "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-blue-100"
          }`}
        >
          <span className="text-center">Ver na {sourceLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
        </a>

        <p className="text-[9px] text-center text-slate-400 font-medium">
          Link oficial | Compra segura
        </p>
      </div>
    </div>
  );
}

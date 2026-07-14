"use client";

import { ArrowRight, Flame, ShoppingBag, Sparkles, Star, Tag, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import RatingStars from "@/components/ui/RatingStars";
import SourceBadge from "@/components/ui/SourceBadge";
import type { AffiliateProduct } from "@/types/product";

interface ProductCardProps {
  product: AffiliateProduct;
}

function getProductTags(product: AffiliateProduct) {
  const tags: Array<{ label: string; className: string; icon: LucideIcon }> = [];

  if (product.is_featured) {
    tags.push({
      label: "Destaque",
      className: "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-200",
      icon: Flame,
    });
  }

  if (product.price <= 50) {
    tags.push({
      label: "Até R$ 50",
      className: "bg-emerald-600 text-white shadow-emerald-100",
      icon: Tag,
    });
  } else if (product.price <= 100) {
    tags.push({
      label: "Até R$ 100",
      className: "bg-blue-600 text-white shadow-blue-100",
      icon: Tag,
    });
  }

  if (product.rating && product.rating >= 4.7) {
    tags.push({
      label: "Bem avaliado",
      className: "bg-slate-950 text-white shadow-slate-200",
      icon: Star,
    });
  }

  if (product.sold_count && product.sold_count >= 100) {
    tags.push({
      label: "Popular",
      className: "bg-purple-600 text-white shadow-purple-100",
      icon: TrendingUp,
    });
  }

  if (tags.length === 0 && product.source === "shein") {
    tags.push({
      label: "Curadoria",
      className: "bg-pink-600 text-white shadow-pink-100",
      icon: Sparkles,
    });
  }

  return tags.slice(0, 2);
}

export default function ProductCard({ product }: ProductCardProps) {
  const detailUrl = `/produto/${product.id}`;
  const visualTags = getProductTags(product);

  return (
    <div
      className={`group relative bg-white rounded-3xl transition-all duration-500 hover:-translate-y-2 ${
        product.is_featured
          ? "border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
          : "border border-slate-100 shadow-sm hover:shadow-xl"
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-slate-50">
        {visualTags.length > 0 ? (
          <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            {visualTags.map((tag) => {
              const Icon = tag.icon;

              return (
                <span
                  key={tag.label}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-tight shadow-lg ${tag.className}`}
                >
                  <Icon className="h-3 w-3 fill-current" />
                  {tag.label}
                </span>
              );
            })}
          </div>
        ) : null}

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
          href={detailUrl}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all active:scale-95 shadow-lg ${
            product.is_featured
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-100"
              : "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-blue-100"
          }`}
        >
          <span className="text-center">Ver oferta</span>
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
        </a>

        <p className="text-[9px] text-center text-slate-400 font-medium">
          Link oficial | Compra segura
        </p>
      </div>
    </div>
  );
}

import { Star } from "lucide-react";

export default function RatingStars({ rating }: { rating?: number | null }) {
  if (!rating) {
    return null;
  }

  return (
    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-slate-100">
      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
      <span className="text-[11px] font-bold text-slate-700">{rating.toFixed(1)}</span>
    </div>
  );
}

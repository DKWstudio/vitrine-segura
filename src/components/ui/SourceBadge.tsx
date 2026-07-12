import type { ProductSource } from "@/types/product";

const labels: Record<ProductSource, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  shein: "Shein",
};

const tones: Record<ProductSource, string> = {
  mercadolivre: "bg-blue-100 text-blue-700",
  shopee: "bg-orange-100 text-orange-700",
  shein: "bg-pink-100 text-pink-700",
};

export default function SourceBadge({ source }: { source: ProductSource }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${tones[source]}`}
    >
      {labels[source]}
    </span>
  );
}
import type { ProductSource } from "@/types/product";

const labels: Record<ProductSource, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
};

export default function SourceBadge({ source }: { source: ProductSource }) {
  const isShopee = source === "shopee";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
        isShopee ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {labels[source]}
    </span>
  );
}

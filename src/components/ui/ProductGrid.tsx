import ProductCard from "@/components/ui/ProductCard";
import type { AffiliateProduct } from "@/types/product";

export default function ProductGrid({ products }: { products: AffiliateProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-black text-slate-900">Nenhum produto encontrado</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Ajuste os filtros ou cadastre novas regras de busca quando o painel admin estiver pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

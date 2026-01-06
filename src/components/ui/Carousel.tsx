import { Product } from "@/types/product";

export default function Carousel({ products }: { products: Product[] }) {
  return (
    <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-hide snap-x">
      {products.map((p) => (
        <div key={p.id} className="min-w-[280px] bg-white p-4 rounded-2xl border border-gray-100 snap-start shadow-sm">
          <img src={p.image} className="h-40 w-full object-contain mb-4" />
          <h4 className="font-bold text-gray-800 truncate">{p.name}</h4>
          <p className="text-blue-700 font-bold text-lg">R$ {p.price}</p>
          <a href={p.url} className="mt-3 block w-full bg-[#FFE600] text-[#2D3277] py-2 rounded-lg text-center font-bold text-sm">
            Ver Oferta
          </a>
        </div>
      ))}
    </div>
  );
}
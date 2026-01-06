"use client";

import { Product } from "@/types/product";
import { Share2, MessageCircle } from "lucide-react"; // npm install lucide-react

export default function DailyTipCard({ product }: { product: Product }) {
  const shareText = `Olha esse achadinho: ${product.name} no Mercado Livre!`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="bg-white border-2 border-[#FFE600] rounded-3xl overflow-hidden shadow-xl">
      <div className="grid md:grid-cols-2 gap-4 p-6">
        <div className="relative h-64 bg-gray-50 rounded-xl overflow-hidden">
          <img src={product.image} alt={product.name} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 leading-tight">{product.name}</h3>
            <div className="flex items-center gap-2 my-2">
               <span className="text-[#2D3277] font-bold text-2xl">R$ {product.price}</span>
               <span className="text-sm text-yellow-500">⭐ {product.rating}</span>
            </div>
            <ul className="space-y-1 mb-4">
              {product.benefits?.map((b, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  ✅ {b}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-3">
            <a href={product.url} target="_blank" className="block w-full bg-[#2D3277] text-white text-center py-4 rounded-xl font-bold hover:bg-[#1e2255] transition-all">
              Ver Oferta no Mercado Livre
            </a>
            <div className="flex gap-2">
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + product.url)}`)} className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg text-sm">
                <MessageCircle size={16}/> WhatsApp
              </button>
              <button onClick={() => navigator.clipboard.writeText(product.url)} className="p-2 border border-gray-200 rounded-lg text-gray-500">
                <Share2 size={18}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
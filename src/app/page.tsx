import type { Metadata } from "next";
import { CheckCircle, Shield, Star, Truck } from "lucide-react";
import ProductCatalog from "@/components/ui/ProductCatalog";
import ProductGrid from "@/components/ui/ProductGrid";
import { getActiveProducts, getMostClickedProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achadinhos uteis",
  description: "Produtos selecionados do Mercado Livre e Shopee por categorias, preco e destaque.",
};

function TrustCards() {
  const items = [
    { icon: Star, text: "4.5+ Estrelas" },
    { icon: Truck, text: "Envio Full" },
    { icon: Shield, text: "Compra Segura" },
    { icon: CheckCircle, text: "Link Oficial" },
  ];

  return (
    <section className="relative z-20 -mt-12 container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {items.map((item) => (
          <div
            key={item.text}
            className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center transition-all hover:translate-y-[-4px]"
          >
            <item.icon className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function VitrineSegura() {
  const [products, mostClickedProducts] = await Promise.all([getActiveProducts(), getMostClickedProducts(8, 7)]);

  return (
    <div id="top" className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      <header className="bg-[#0F172A] pt-16 pb-24 text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-sm mb-6 border border-white/10 inline-block">
            <img
              src="/img/vitrineSegura.png"
              alt="Vitrine Segura"
              className="w-full max-w-[220px] md:max-w-[420px] h-auto"
            />
          </div>
          <h1 className="text-4xl md:text-7xl font-black uppercase italic text-white tracking-tighter">
            Achadinhos <span className="text-[#FFE600]">Uteis</span>
          </h1>
          <p className="text-sm md:text-xl text-slate-400 mt-2 font-medium italic">
            Os melhores produtos do Mercado Livre e Shopee hoje
          </p>
        </div>
      </header>

      <TrustCards />

      {mostClickedProducts.length > 0 ? (
        <section className="container mx-auto max-w-[1200px] px-4 pt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Ranking real</p>
              <h2 className="text-2xl font-black uppercase text-slate-950 md:text-3xl">Mais clicados da semana</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Produtos que mais receberam cliques nos últimos 7 dias.</p>
            </div>
          </div>
          <ProductGrid products={mostClickedProducts} />
        </section>
      ) : null}

      <ProductCatalog products={products} />
    </div>
  );
}




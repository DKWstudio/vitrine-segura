// BUILD UPDATE: 06/01/2026 - v6.0 (Blue Buttons / Yellow Hover & Active)
"use client";

import { useState, useEffect } from "react";
import { Star, Truck, Shield, CheckCircle, ArrowUp, Flame, ArrowRight } from "lucide-react";
import { products } from "@/data/products";
import ProductCard from "@/components/ui/ProductCard";

const UrgencyBanner = ({ count }: { count: number }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const hours = 3 - (now.getHours() % 4);
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();
      setTimeLeft({ hours, minutes, seconds });
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 mt-6">
      <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 p-3 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-center gap-4 text-white border border-white/20">
        <div className="flex items-center gap-2 font-black italic uppercase text-sm md:text-base text-center">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          Lote de ofertas expira em:
          <span className="font-mono bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm ml-2">
            {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
          </span>
        </div>
        <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-center">
          🔥 {count} pessoas garantiram descontos agora
        </div>
      </div>
    </div>
  );
};

export default function VitrineSegura() {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Casa');
  const [globalBuyersCount, setGlobalBuyersCount] = useState(37);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setGlobalBuyersCount(Math.floor(Math.random() * 10) + 28);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const categories = [
    { id: 'Casa', label: '🏠 Casa' },
    { id: 'Eletrônicos', label: '🔌 Eletrônicos' },
    { id: 'Beleza', label: '💄 Beleza' },
    { id: 'Audio', label: '🎧 Áudio' },
    { id: 'Roupas-Masc', label: '👕 Masculino' },
    { id: 'Roupas-Fem', label: '👗 Feminino' },
    { id: 'Infantil', label: '🧸 Infantil' },
    { id: 'Auto', label: '🚗 Auto' },
    { id: 'Suplementos', label: '🥤 Suplementos' },
  ];

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  if (!mounted) return <div className="min-h-screen bg-[#0F172A]" />;

  return (
    <div id="top" className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      
      {/* HEADER PREMIUM */}
      <header className="bg-[#0F172A] pt-16 pb-24 text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-sm mb-6 border border-white/10 inline-block">
             <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="w-full max-w-[220px] md:max-w-[420px] h-auto" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black uppercase italic text-white tracking-tighter">
            Achadinhos <span className="text-[#FFE600]">Úteis</span>
          </h1>
          <p className="text-sm md:text-xl text-slate-400 mt-2 font-medium italic">Os melhores produtos do Mercado Livre hoje</p>
        </div>
      </header>

      {/* CARDS DE CONFIANÇA */}
      <section className="relative z-20 -mt-12 container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { icon: Star, t: "4.5+ Estrelas" }, 
            { icon: Truck, t: "Envio Full" }, 
            { icon: Shield, t: "Compra Segura" }, 
            { icon: CheckCircle, t: "Link Oficial" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center transition-all hover:translate-y-[-4px]">
              <item.icon className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{item.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* NAV: BOTÕES AZUIS COM HOVER E ACTIVE EM AMARELO */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 py-5 shadow-sm mt-8">
        <div className="container mx-auto px-4">
          
          <div className="flex items-center justify-between mb-3 md:hidden">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navegar por:</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <span className="text-[9px] font-black text-slate-500 uppercase animate-pulse">Arraste</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 mask-fade-edge">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2
                  ${selectedCategory === cat.id 
                    ? "bg-[#FFE600] text-[#0F172A] border-[#FFE600] shadow-md scale-105" 
                    : "bg-[#0F172A] text-white border-[#0F172A] hover:bg-[#FFE600] hover:text-[#0F172A] hover:border-[#FFE600]"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <UrgencyBanner count={globalBuyersCount} />

      <main className="container mx-auto px-4 py-8 max-w-[1200px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {filteredProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>

      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl z-50 md:hidden border-2 border-white/20 active:scale-90"
      >
        <ArrowUp className="h-6 w-6" />
      </button>

    </div>
  );
}
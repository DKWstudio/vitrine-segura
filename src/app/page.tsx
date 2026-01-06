"use client";

import { useState, useEffect } from "react";
// ADICIONADO ArrowRight NA IMPORTAÇÃO ABAIXO
import { Star, Truck, Shield, CheckCircle, ArrowUp, Flame, ChevronDown, ArrowRight } from "lucide-react";
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
      <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_auto] animate-gradient-x p-3 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-center gap-4 text-white border border-white/20">
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
          🔥 {count} pessoas garantiram descontos na última hora
        </div>
      </div>
    </div>
  );
};

const RecentSales = ({ onNewSale }: { onNewSale: () => void }) => {
  const [sales, setSales] = useState<{ name: string; city: string } | null>(null);
  const [visible, setVisible] = useState(false);

  const cities = ["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Salvador", "Porto Alegre", "Brasília", "Fortaleza", "Manaus", "Florianópolis"];
  const productsNames = ["um item de Casa", "um Eletrônico", "um item de Beleza", "um Suplemento", "um fone de ouvido"];

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    const triggerNextSale = () => {
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      const randomProduct = productsNames[Math.floor(Math.random() * productsNames.length)];
      setSales({ name: randomProduct, city: randomCity });
      setVisible(true);
      onNewSale(); 

      timerId = setTimeout(() => {
        setVisible(false);
        const nextPause = Math.floor(Math.random() * (180000 - 60000 + 1) + 60000);
        timerId = setTimeout(triggerNextSale, nextPause);
      }, 8000);
    };
    timerId = setTimeout(triggerNextSale, 20000);
    return () => clearTimeout(timerId);
  }, [onNewSale]);

  if (!sales) return null;

  return (
    <div className={`fixed bottom-6 left-6 z-[100] transition-all duration-1000 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 max-w-[280px]">
        <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0">
          <Flame className="h-5 w-5 fill-white" />
        </div>
        <p className="text-[10px] leading-tight text-slate-600 font-medium">
          Alguém de <span className="text-slate-900 font-bold">{sales.city}</span> acabou de garantir <span className="text-amber-700 font-bold">{sales.name}</span>.
        </p>
      </div>
    </div>
  );
};

export default function VitrineSegura() {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Casa');
  const [specialFilter, setSpecialFilter] = useState<'none' | 'promo' | 'top'>('none');
  const [globalBuyersCount, setGlobalBuyersCount] = useState(37);

  useEffect(() => {
    setMounted(true);
    setGlobalBuyersCount(Math.floor(Math.random() * 10) + 28);
  }, []);

  const handleNewSale = () => setGlobalBuyersCount(prev => prev + 1);

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

  const filteredProducts = products.filter(p => {
    const matchesCategory = p.category === selectedCategory;
    if (specialFilter === 'promo') return matchesCategory && p.price < 50;
    if (specialFilter === 'top') return matchesCategory && p.rating >= 4.8;
    return matchesCategory;
  });

  if (!mounted) return <div className="min-h-screen bg-[#0F172A]" />;

  return (
    <div id="top" className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      <header className="relative overflow-hidden bg-[#0F172A] text-white pt-16 pb-24 text-center">
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-sm mb-6 border border-white/10 inline-block">
             <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="w-full max-w-[220px] md:max-w-[420px] h-auto" />
          </div>
          <h1 className="text-3xl md:text-7xl font-extrabold uppercase italic">Achadinhos Úteis</h1>
          <p className="text-sm md:text-xl text-slate-400 mt-2">Os mais vendidos do Mercado Livre hoje</p>
        </div>
      </header>

      <section className="relative z-20 -mt-8 container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {[{ icon: Star, t: "4.5+ Estrelas" }, { icon: Truck, t: "Envio Full" }, { icon: Shield, t: "Compra Segura" }, { icon: CheckCircle, t: "Link Oficial" }].map((item, i) => (
            <div key={i} className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex flex-col items-center">
              <item.icon className="h-5 w-5 text-blue-600 mb-1" />
              <span className="text-[10px] font-bold uppercase">{item.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MENU DE CATEGORIAS COM INDICADOR DE SCROLL CORRIGIDO */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 py-4 mt-8">
        <div className="container mx-auto px-4">
          
          <div className="flex items-center justify-between mb-2 md:hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categorias</span>
            <div className="flex items-center gap-1 animate-pulse">
              <span className="text-[9px] font-bold text-blue-800 uppercase">Arraste</span>
              <ArrowRight className="h-3 w-3 text-blue-600" />
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 mask-fade-edge">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => { setSelectedCategory(cat.id); setSpecialFilter('none'); }}
                className={`flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 border-2
                  ${selectedCategory === cat.id 
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-400 shadow-lg shadow-blue-200" 
                    : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <UrgencyBanner count={globalBuyersCount} />

      <main className="container mx-auto px-4 py-8 max-w-[1200px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
          {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </main>

      <RecentSales onNewSale={handleNewSale} />
      
      {/* Botão flutuante para voltar ao topo no mobile */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl z-50 md:hidden active:scale-90 transition-transform border-2 border-white/20"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </div>
  );
}
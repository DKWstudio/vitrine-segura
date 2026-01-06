"use client";

import { useState, useEffect } from "react";
import { Star, Truck, Shield, CheckCircle, ArrowUp, Flame, ChevronDown } from "lucide-react";
import { products } from "@/data/products";
import ProductCard from "@/components/ui/ProductCard";

// 1. COMPONENTE DE BANNER DE URGÊNCIA
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
        <div className="flex items-center gap-2 font-black italic uppercase text-sm md:text-base">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          Lote de ofertas atual expira em:
        </div>
        
        <div className="flex items-center gap-2 font-mono text-xl md:text-2xl font-bold bg-black/20 px-4 py-1 rounded-xl backdrop-blur-sm">
          {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
        </div>

        <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-center min-w-[280px]">
          🔥 {count} pessoas garantiram descontos na última hora
        </div>
      </div>
    </div>
  );
};

// 2. COMPONENTE DE NOTIFICAÇÕES
const RecentSales = ({ onNewSale }: { onNewSale: () => void }) => {
  const [sales, setSales] = useState<{ name: string; city: string } | null>(null);
  const [visible, setVisible] = useState(false);

  const cities = ["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Salvador", "Porto Alegre", "Brasília", "Fortaleza", "Manaus", "Florianópolis", "Itajaí", "Balneário Camboriú"];
  const productsNames = ["um item de Casa", "um Eletrônico", "um item de Beleza", "um Suplemento", "um fone de ouvido", "um item Automotivo"];

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
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 max-w-[280px] backdrop-blur-md">
        <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0">
          <Flame className="h-5 w-5 fill-white" />
        </div>
        <div>
          <p className="text-[10px] leading-tight text-slate-600 font-medium">
            Alguém de <span className="text-slate-900 font-bold">{sales.city}</span> acabou de garantir <span className="text-amber-700 font-bold">{sales.name}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

// 3. SEÇÃO DE FAQ
const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: "É seguro comprar através desses links?", a: "Sim, 100% seguro. Todos os links redirecionam para o Mercado Livre oficial." },
    { q: "Como recebo o produto?", a: "Pelo Mercado Livre, a maioria com selo FULL em até 24h." },
    { q: "Os produtos têm garantia?", a: "Sim, garantia do fabricante e compra garantida Mercado Livre." },
    { q: "Por que os preços variam?", a: "Pela dinâmica de estoque e vendedores no marketplace." }
  ];

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-8 text-center italic uppercase">Dúvidas Frequentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button onClick={() => setOpenIndex(openIndex === idx ? null : idx)} className="w-full p-4 text-left flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === idx && <div className="p-4 pt-0 text-xs text-slate-500 border-t border-slate-50">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 4. PÁGINA PRINCIPAL
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
    <div id="top" className="min-h-screen bg-[#F8FAFC] scroll-smooth font-sans antialiased text-slate-900">
      
      <header className="relative overflow-hidden bg-[#0F172A] text-white pt-16 pb-24 text-center">
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
          <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-sm mb-6 border border-white/10">
            <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="w-full max-w-[240px] md:max-w-[420px] h-auto mx-auto" />
          </div>
          <h1 className="text-3xl md:text-7xl font-extrabold uppercase italic leading-tight">Achadinhos Úteis</h1>
          <p className="text-sm md:text-xl text-slate-400 mt-2">Os mais vendidos do Mercado Livre hoje</p>
        </div>
      </header> 

      {/* CONFIANÇA */}
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

      {/* NAV CORRIGIDA - QUEBRA DE LINHA */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 py-4 mt-8">
  <div className="container mx-auto px-4">
    {/* flex-wrap permite quebrar a linha. justify-center centraliza os botões */}
    <div className="flex flex-wrap justify-center items-center gap-2">
      {categories.map(cat => (
        <button 
          key={cat.id} 
          onClick={() => { setSelectedCategory(cat.id); setSpecialFilter('none'); }}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight border transition-all
            ${selectedCategory === cat.id 
              ? "bg-blue-600 text-white border-blue-600 shadow-md" 
              : "bg-white text-slate-600 border-slate-100 shadow-sm"}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  </div>
</nav>

      <UrgencyBanner count={globalBuyersCount} />

      {/* FILTROS ESPECIAIS */}
      <div className="container mx-auto px-4 mt-6 flex justify-center gap-3">
        <button onClick={() => setSpecialFilter(specialFilter === 'promo' ? 'none' : 'promo')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 ${specialFilter === 'promo' ? "bg-red-500 text-white border-red-600" : "bg-white border-slate-100"}`}>🔥 Até R$50</button>
        <button onClick={() => setSpecialFilter(specialFilter === 'top' ? 'none' : 'top')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 ${specialFilter === 'top' ? "bg-amber-500 text-white border-amber-600" : "bg-white border-slate-100"}`}>⭐ Top 4.8+</button>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-[1200px]">
        {/* GRID CORRIGIDO - GAP MENOR NO MOBILE */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-10">
          {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </main>

      <FaqSection />

      <footer className="bg-[#0A0F1C] text-white py-12 text-center border-t border-slate-800">
        <div className="container mx-auto px-4 space-y-6">
          <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="h-10 mx-auto brightness-0 invert" />
          <p className="text-[10px] text-slate-500 max-w-xs mx-auto">© 2026 – Vitrine Segura. Afiliado oficial Mercado Livre.</p>
        </div>
      </footer>

      <RecentSales onNewSale={handleNewSale} />
    </div>
  );
}
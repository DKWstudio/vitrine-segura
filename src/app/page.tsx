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

// 2. COMPONENTE DE NOTIFICAÇÕES (RITMO REALMENTE PAUSADO)
const RecentSales = ({ onNewSale }: { onNewSale: () => void }) => {
  const [sales, setSales] = useState<{ name: string; city: string } | null>(null);
  const [visible, setVisible] = useState(false);

  const cities = ["São Paulo", "Rio de Janeiro", "Modelo", "Curitiba", "Belo Horizonte", "Maravilha", "Salvador", "Porto Alegre", "Chapecó", "Brasília", "Fortaleza", "Manaus", "Recife", "Campinas", "Goiânia", "Vitória", "Florianópolis", "Pinhalzinho", "Itajaí", "Balneário Camboriú"];
  const productsNames = ["um item de Casa", "um Eletrônico", "um item de Beleza", "um Suplemento", "um fone de ouvido", "um item Automotivo", "um utensílio de Cozinha"];

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const triggerNextSale = () => {
      // 1. Prepara os dados
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      const randomProduct = productsNames[Math.floor(Math.random() * productsNames.length)];
      setSales({ name: randomProduct, city: randomCity });
      
      // 2. Mostra a notificação e atualiza o contador global
      setVisible(true);
      onNewSale(); 

      // 3. Mantém visível por 8 segundos
      timerId = setTimeout(() => {
        setVisible(false);
        
        // 4. ESPERA: Só agenda a próxima após o balão sumir.
        // Intervalo entre 60 e 180 segundos (1 a 3 minutos de PAUSA REAL)
        const nextPause = Math.floor(Math.random() * (180000 - 60000 + 1) + 60000);
        timerId = setTimeout(triggerNextSale, nextPause);
        
      }, 8000);
    };

    // Primeira aparição após 20 segundos de navegação
    timerId = setTimeout(triggerNextSale, 20000);

    return () => clearTimeout(timerId);
  }, [onNewSale]);

  if (!sales) return null;

  return (
    <div className={`fixed bottom-6 left-6 z-[100] transition-all duration-1000 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="bg-amber-50 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-amber-200/60 flex items-center gap-4 max-w-[320px] backdrop-blur-md">
        <div className="relative">
          <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-inner">
             <Flame className="h-6 w-6 fill-white" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
        <div>
          <p className="text-[11px] leading-tight text-slate-600 font-medium">
            Alguém de <span className="text-slate-900 font-bold">{sales.city}</span> acabou de garantir <span className="text-amber-700 font-bold">{sales.name}</span>.
          </p>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-[9px] text-amber-600 font-black uppercase tracking-tighter italic">Oferta Aproveitada ✅</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. SEÇÃO DE FAQ
const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "É seguro comprar através desses links?",
      a: "Sim, 100% seguro. Todos os links da nossa vitrine redirecionam você diretamente para a plataforma oficial do Mercado Livre. O pagamento e a entrega são processados por eles, garantindo sua proteção total."
    },
    {
      q: "Como recebo o produto?",
      a: "Após a compra no Mercado Livre, você receberá todas as atualizações por e-mail e pelo app. A maioria dos nossos achadinhos possui selo 'FULL', chegando em sua casa em até 24h ou 48h."
    },
    {
      q: "Os produtos têm garantia?",
      a: "Com certeza. Além da garantia do fabricante, você conta com o programa 'Compra Garantida' do Mercado Livre: se não gostar ou tiver qualquer defeito, você tem até 30 dias para devolver e receber seu dinheiro de volta."
    },
    {
      q: "Por que os preços podem variar?",
      a: "O Mercado Livre é um marketplace dinâmico. Nossa equipe atualiza a vitrine diariamente, mas como os estoques são limitados, os preços podem sofrer alterações conforme a disponibilidade dos vendedores."
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Dúvidas Frequentes</h2>
          <p className="text-slate-500 font-medium italic">Tudo o que você precisa saber para comprar com tranquilidade</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 shadow-sm">
              <button 
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between group"
              >
                <span className={`font-bold transition-colors ${openIndex === idx ? 'text-blue-600' : 'text-slate-800'}`}>{faq.q}</span>
                <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openIndex === idx ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-5 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-50">{faq.a}</div>
              </div>
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
    { id: 'Casa', label: '🏠 Casa & Utilidades' },
    { id: 'Eletrônicos', label: '🔌 Eletrônicos' },
    { id: 'Beleza', label: '💄 Beleza' },
    { id: 'Audio', label: '🎧 Áudio e Vídeo' },
    { id: 'Roupas-Masc', label: '👕 Masculino' },
    { id: 'Roupas-Fem', label: '👗 Feminino' },
    { id: 'Infantil', label: '🧸 Infantil' },
    { id: 'Auto', label: '🚗 Automotivo' },
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
      
      {/* HEADER E HERO */}
      <header className="relative overflow-hidden bg-[#0F172A] text-white pt-16 pb-24 md:pt-20 md:pb-28">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
          <div className="bg-white/5 p-6 rounded-3xl backdrop-blur-sm mb-8 border border-white/10 shadow-2xl">
            <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="w-full max-w-[280px] md:max-w-[420px] h-auto object-contain mx-auto" />
          </div>
          <div className="max-w-4xl space-y-4 md:space-y-6">
            <h1 className="text-3xl md:text-7xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 uppercase">
              Achadinhos Úteis <br className="hidden md:block"/> do Dia a Dia
            </h1>
            <p className="text-base md:text-xl text-slate-400 font-medium italic max-w-2xl mx-auto">Os produtos mais vendidos do Mercado Livre hoje — veja antes que acabem</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8FAFC] to-transparent"></div>
      </header>   

      {/* CONFIANÇA E CATEGORIAS */}
      <section className="relative z-20 -mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Star, text: "Alta Avaliação", sub: "4.5+ estrelas", color: "text-yellow-500" },
              { icon: Truck, text: "Envio Full", sub: "Entrega rápida", color: "text-green-500" },
              { icon: Shield, text: "Compra Segura", sub: "100% Protegido", color: "text-blue-500" },
              { icon: CheckCircle, text: "Verificado", sub: "Link Oficial", color: "text-emerald-500" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-xl flex flex-col items-center text-center border border-slate-100 transition-transform hover:-translate-y-1">
                <div className={`${item.color} mb-3 p-3 bg-slate-50 rounded-xl`}><item.icon className="h-6 w-6 md:h-8 md:w-8" /></div>
                <h4 className="text-sm font-bold text-slate-800">{item.text}</h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 py-4 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-nowrap md:flex-wrap md:justify-center items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => { setSelectedCategory(cat.id); setSpecialFilter('none'); }}
                className={`flex-shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest transition-all border
                  ${selectedCategory === cat.id ? "bg-blue-600 text-white border-blue-600 shadow-blue-200" : "bg-white text-slate-600 border-slate-200 hover:border-blue-500"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* COMPONENTES DE PERSUASÃO */}
      <UrgencyBanner count={globalBuyersCount} />

      <div className="container mx-auto px-4 mt-8 flex flex-wrap justify-center gap-4">
        <button onClick={() => setSpecialFilter(specialFilter === 'promo' ? 'none' : 'promo')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase border-2 transition-all shadow-sm ${specialFilter === 'promo' ? "bg-red-500 border-red-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-red-400"}`}>
          {specialFilter === 'promo' ? "✕ Limpar" : "🔥 Ofertas Até R$50"}
        </button>
        <button onClick={() => setSpecialFilter(specialFilter === 'top' ? 'none' : 'top')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase border-2 transition-all shadow-sm ${specialFilter === 'top' ? "bg-amber-500 border-amber-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-amber-400"}`}>
          {specialFilter === 'top' ? "✕ Limpar" : "⭐ Top Avaliados (4.8+)"}
        </button>
      </div>

      <main id="vitrine" className="container mx-auto px-4 py-12 max-w-[1300px] min-h-[600px]">
        {categories.filter(cat => cat.id === selectedCategory).map(cat => (
          <section key={cat.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight italic">
                  {cat.label} <span className="text-blue-600">{specialFilter !== 'none' && " • Seleção Especial"}</span>
                </h3>
                <div className="h-1.5 w-20 bg-blue-600 rounded-full"></div>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 rounded-full bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all"><ArrowUp className="h-5 w-5" /></button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-10">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => <ProductCard key={p.id} product={p} />)
              ) : (
                <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">Nenhum produto encontrado neste filtro.</p>
                  <button onClick={() => setSpecialFilter('none')} className="mt-4 text-blue-600 underline font-extrabold">Ver todos da categoria</button>
                </div>
              )}
            </div>
          </section>
        ))}
      </main>

      <FaqSection />

      {/* 5. FOOTER (CORRIGIDO) */}
      <footer className="bg-[#0A0F1C] text-white py-16 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center max-w-6xl mx-auto gap-12 md:gap-0">
            {/* COLUNA DK WORKS STUDIO */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Landing Page criada por</p>
              <a href="https://dkworksstudio.base44.app/" target="_blank" className="group">
                <img src="/img/dkTransparente.png" alt="DK Works" className="h-14 w-auto brightness-0 invert opacity-90 transition-transform group-hover:scale-105" />
              </a>
              <p className="text-sm text-slate-300 font-medium">Consultoria em TI & Soluções Digitais</p>
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <a href="mailto:dkworksstudio@gmail.com" className="text-[11px] text-yellow-500 font-extrabold flex items-center gap-2">📩 dkworksstudio@gmail.com</a>
                <a href="https://dkworksstudio.base44.app/" target="_blank" className="text-[11px] text-[#3B82F6] font-extrabold flex items-center gap-2">🌐 Visitar Website</a>
              </div>
            </div>

            <div className="hidden md:block h-32 w-[1px] bg-slate-700/50 mx-16"></div>

            {/* COLUNA VITRINE SEGURA */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
              <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="h-16 md:h-20 w-auto brightness-0 invert opacity-90" />
              <div className="space-y-1">
                <p className="text-slate-300 font-bold text-base italic">© 2026 – Vitrine Segura</p>
                <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                  Afiliado Mercado Livre – Compras realizadas diretamente na plataforma oficial através de links verificados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <RecentSales onNewSale={handleNewSale} />
    </div>
  );
}
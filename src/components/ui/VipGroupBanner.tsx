import { MessageCircle, Send, Sparkles } from "lucide-react";

const vipGroupUrl = process.env.NEXT_PUBLIC_VIP_GROUP_URL?.trim();

export default function VipGroupBanner() {
  if (!vipGroupUrl) {
    return null;
  }

  const isTelegram = vipGroupUrl.includes("t.me") || vipGroupUrl.includes("telegram");
  const channelLabel = isTelegram ? "Telegram" : "WhatsApp";

  return (
    <section className="container mx-auto mt-8 px-4">
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-xl md:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FFE600]/20 blur-2xl" />
        <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-[#FFE600] text-slate-950 shadow-lg">
              {isTelegram ? <Send className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                  Grupo VIP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFE600] px-3 py-1 text-[10px] font-black uppercase text-slate-950">
                  <Sparkles className="h-3 w-3" /> Ofertas antes
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase leading-tight tracking-tight md:text-3xl">
                Receba achadinhos antes de todo mundo
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-300">
                Entre no nosso grupo VIP e acompanhe ofertas selecionadas, campanhas especiais e cupons direto no {channelLabel}.
              </p>
            </div>
          </div>

          <a
            href={vipGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-none items-center justify-center gap-2 rounded-2xl bg-[#FFE600] px-6 py-4 text-sm font-black uppercase text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            Entrar no grupo <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

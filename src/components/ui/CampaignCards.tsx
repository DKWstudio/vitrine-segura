import { ExternalLink, Gift, Tag } from "lucide-react";
import type { Campaign, ProductSource } from "@/types/product";

function getSourceStyle(source: ProductSource) {
  if (source === "shopee") {
    return {
      label: "Shopee",
      card: "border-orange-200 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white",
      media: "bg-orange-100/90",
      badge: "bg-white text-orange-700",
      highlight: "bg-yellow-300 text-slate-950",
      coupon: "bg-white text-orange-700",
      button: "bg-white text-orange-700 hover:bg-orange-50",
      icon: "text-orange-600",
    };
  }

  if (source === "shein") {
    return {
      label: "Shein",
      card: "border-slate-800 bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white",
      media: "bg-slate-900",
      badge: "bg-white text-slate-950",
      highlight: "bg-yellow-300 text-slate-950",
      coupon: "bg-white text-slate-950",
      button: "bg-white text-slate-950 hover:bg-slate-100",
      icon: "text-white",
    };
  }

  return {
    label: "Mercado Livre",
    card: "border-blue-200 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white",
    media: "bg-blue-100/90",
    badge: "bg-white text-blue-700",
    highlight: "bg-yellow-300 text-slate-950",
    coupon: "bg-white text-blue-700",
    button: "bg-white text-blue-700 hover:bg-blue-50",
    icon: "text-blue-600",
  };
}

export default function CampaignCards({ campaigns }: { campaigns: Campaign[] }) {
  const visibleCampaigns = campaigns.slice(0, 2);

  if (visibleCampaigns.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto mt-8 px-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Campanhas</p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Ofertas especiais</h2>
        </div>
        <p className="max-w-xl text-sm font-semibold text-slate-500">
          Campanhas oficiais selecionadas para garimpar varios achadinhos de uma vez.
        </p>
      </div>

      <div className="grid gap-4">
        {visibleCampaigns.map((campaign) => {
          const style = getSourceStyle(campaign.source);

          return (
            <article key={campaign.id} className={`overflow-hidden rounded-3xl border shadow-lg ${style.card}`}>
              <div className="flex flex-col md:flex-row md:items-stretch">
                <div className={`m-3 flex h-56 items-center justify-center overflow-hidden rounded-2xl md:h-auto md:w-[31%] md:min-w-[260px] lg:min-w-[310px] ${style.media}`}>
                  {campaign.image_url ? (
                    <img src={campaign.image_url} alt={campaign.title} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/10">
                      <Gift className={`h-12 w-12 ${style.icon}`} />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 px-5 pb-5 pt-1 md:px-5 md:py-5 lg:px-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${style.badge}`}>
                      {style.label}
                    </span>
                    {campaign.is_featured ? (
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${style.highlight}`}>
                        Destaque
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black leading-tight tracking-tight md:text-3xl">{campaign.title}</h3>
                    {campaign.description ? (
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-relaxed text-white/80 md:text-base">
                        {campaign.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {campaign.coupon_code ? (
                      <p className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase ${style.coupon}`}>
                        <Tag className="h-3.5 w-3.5" /> {campaign.coupon_code}
                      </p>
                    ) : (
                      <span />
                    )}

                    <a
                      href={`/go/campaign/${campaign.id}`}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase transition ${style.button}`}
                    >
                      Ver campanha <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

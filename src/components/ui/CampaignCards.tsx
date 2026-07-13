import { ExternalLink, Gift, Tag } from "lucide-react";
import type { Campaign, ProductSource } from "@/types/product";

function getSourceStyle(source: ProductSource) {
  if (source === "shopee") {
    return {
      label: "Shopee",
      card: "border-orange-200 bg-orange-50",
      badge: "bg-orange-600 text-white",
      button: "bg-orange-600 text-white hover:bg-orange-700",
      icon: "text-orange-600",
    };
  }

  if (source === "shein") {
    return {
      label: "Shein",
      card: "border-slate-800 bg-slate-950 text-white",
      badge: "bg-white text-slate-950",
      button: "bg-white text-slate-950 hover:bg-slate-100",
      icon: "text-white",
    };
  }

  return {
    label: "Mercado Livre",
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-600 text-white",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    icon: "text-blue-600",
  };
}

export default function CampaignCards({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto mt-8 px-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Campanhas</p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Ofertas especiais</h2>
        </div>
        <p className="max-w-xl text-sm font-semibold text-slate-500">
          Links oficiais de campanhas e colecoes selecionadas para garimpar varios achadinhos de uma vez.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((campaign) => {
          const style = getSourceStyle(campaign.source);

          return (
            <article key={campaign.id} className={`overflow-hidden rounded-2xl border p-4 shadow-sm ${style.card}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-white/80 shadow-sm">
                  {campaign.image_url ? (
                    <img src={campaign.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Gift className={`h-6 w-6 ${style.icon}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style.badge}`}>
                      {style.label}
                    </span>
                    {campaign.is_featured ? (
                      <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">
                        Destaque
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-tight">{campaign.title}</h3>
                  {campaign.description ? (
                    <p className="mt-2 line-clamp-2 text-sm font-semibold opacity-80">{campaign.description}</p>
                  ) : null}
                  {campaign.coupon_code ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase text-slate-950">
                      <Tag className="h-3.5 w-3.5" /> {campaign.coupon_code}
                    </p>
                  ) : null}
                </div>
              </div>

              <a
                href={`/go/campaign/${campaign.id}`}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase transition ${style.button}`}
              >
                Ver campanha <ExternalLink className="h-4 w-4" />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
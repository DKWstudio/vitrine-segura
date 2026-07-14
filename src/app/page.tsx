import type { Metadata } from "next";
import { CheckCircle, Shield, Star, Truck } from "lucide-react";
import CampaignCards from "@/components/ui/CampaignCards";
import ProductCatalog from "@/components/ui/ProductCatalog";
import SiteFooter from "@/components/ui/SiteFooter";
import VipGroupBanner from "@/components/ui/VipGroupBanner";
import { getActiveCampaigns } from "@/lib/campaigns";
import { getActiveProducts, getMostClickedProducts } from "@/lib/products";
import { absoluteUrl, defaultOgImage, defaultOgImageAlt, siteName } from "@/lib/seo";
import type { AffiliateProduct } from "@/types/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achadinhos \u00FAteis",
  description: "Produtos selecionados do Mercado Livre, Shopee e Shein por categorias, pre\u00E7o e destaque.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Vitrine Segura | Achadinhos \u00FAteis e ofertas selecionadas",
    description: "Produtos selecionados do Mercado Livre, Shopee e Shein com links oficiais e curadoria di\u00E1ria.",
    url: absoluteUrl("/"),
    siteName,
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: defaultOgImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vitrine Segura | Achadinhos \u00FAteis",
    description: "Curadoria de achadinhos, campanhas e ofertas com links oficiais.",
    images: [defaultOgImage],
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function buildHomeJsonLd(products: AffiliateProduct[]) {
  const itemList = products.slice(0, 12).map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(`/produto/${product.id}`),
    name: product.title,
    image: product.image_url || undefined,
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/img/vitrineSegura.png"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Achadinhos em destaque da Vitrine Segura",
      itemListElement: itemList,
    },
  ];
}

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

export default async function VitrineSegura({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const queryParams = searchParams ? await searchParams : {};
  const initialSearchQuery = getSingleParam(queryParams.q).slice(0, 80);
  const [products, mostClickedProducts, campaigns] = await Promise.all([
    getActiveProducts(),
    getMostClickedProducts(8, 7),
    getActiveCampaigns(),
  ]);
  const homeJsonLd = buildHomeJsonLd(products);

  return (
    <div id="top" className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

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
            Os melhores produtos do Mercado Livre, Shopee e Shein hoje
          </p>
        </div>
      </header>

      <TrustCards />

      <CampaignCards campaigns={campaigns} />

      <VipGroupBanner />

      <ProductCatalog
        products={products}
        mostClickedProducts={mostClickedProducts}
        initialSearchQuery={initialSearchQuery}
      />

      <SiteFooter />
    </div>
  );
}

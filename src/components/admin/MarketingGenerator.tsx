"use client";

import { useMemo, useState } from "react";
import type { AffiliateProduct, ProductSource } from "@/types/product";

type MarketingFormat = "whatsapp" | "instagram" | "tiktok";
type MarketingTheme = "most_clicked" | "featured" | "up_to_50" | "up_to_100" | "category" | "recent";
type SourceFilter = "all" | ProductSource;

type MarketingGeneratorProps = {
  products: AffiliateProduct[];
  clickCountsByProduct: Record<string, number>;
};

const sourceLabels: Record<SourceFilter, string> = {
  all: "Todas",
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  shein: "Shein",
};

const themeLabels: Record<MarketingTheme, string> = {
  most_clicked: "Mais clicados",
  featured: "Destaques",
  up_to_50: "Ate R$ 50",
  up_to_100: "Ate R$ 100",
  category: "Por categoria",
  recent: "Mais recentes",
};

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Preco sob consulta";
  }

  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getProductUrl(productId: string) {
  if (typeof window === "undefined") {
    return `/produto/${productId}`;
  }

  return `${window.location.origin}/produto/${productId}`;
}

function getPortalUrl() {
  if (typeof window === "undefined") {
    return "https://vitrine-segura.vercel.app";
  }

  return window.location.origin;
}

function getVipGroupUrl() {
  return "https://chat.whatsapp.com/LxGXGvPyy9NHerUxOD99Aj";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMainCollectionUrl(theme: MarketingTheme, category: string, source: SourceFilter) {
  const portalUrl = getPortalUrl();

  if (theme === "up_to_50") return `${portalUrl}/ofertas/ate-50`;
  if (theme === "up_to_100") return `${portalUrl}/ofertas/ate-100`;
  if (theme === "category" && category) return `${portalUrl}/categoria/${slugify(category)}`;
  if (source === "shopee") return `${portalUrl}/shopee`;
  if (source === "shein") return `${portalUrl}/shein`;
  if (source === "mercadolivre") return `${portalUrl}/mercadolivre`;

  return portalUrl;
}

function getThemeIntro(theme: MarketingTheme, category: string) {
  if (theme === "up_to_50") return "Achadinhos ate R$ 50 que valem a pena";
  if (theme === "up_to_100") return "Achadinhos ate R$ 100 para aproveitar hoje";
  if (theme === "featured") return "Ofertas em destaque na Vitrine Segura";
  if (theme === "category" && category) return `Achadinhos de ${category}`;
  if (theme === "recent") return "Novidades que acabaram de entrar no portal";
  return "Os achadinhos mais clicados da Vitrine Segura";
}

function getHashtags(source: SourceFilter, theme: MarketingTheme, category: string) {
  const tags = ["#vitrinesegura", "#achadinhos", "#ofertasdodia", "#comprasonline"];

  if (source === "shopee") tags.push("#achadinhosshopee", "#shopee");
  if (source === "shein") tags.push("#shein", "#achadinhosshein");
  if (source === "mercadolivre") tags.push("#mercadolivre", "#achadinhosmercadolivre");
  if (theme === "up_to_50") tags.push("#ate50reais");
  if (theme === "up_to_100") tags.push("#ate100reais");
  if (category) tags.push(`#${category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 28)}`);

  return Array.from(new Set(tags)).join(" ");
}

function buildProductLine(product: AffiliateProduct, index: number, includeSource = true) {
  const source = includeSource ? ` - ${sourceLabels[product.source]}` : "";
  return `${index + 1}. ${product.title}\n${formatCurrency(product.price)}${source}\n${getProductUrl(product.id)}`;
}

function buildInstagramProductLine(product: AffiliateProduct, index: number) {
  return `${index + 1}. ${product.title}\n${formatCurrency(product.price)} - ${sourceLabels[product.source]}`;
}

function generateMessage({
  format,
  theme,
  source,
  category,
  selectedProducts,
}: {
  format: MarketingFormat;
  theme: MarketingTheme;
  source: SourceFilter;
  category: string;
  selectedProducts: AffiliateProduct[];
}) {
  const title = getThemeIntro(theme, category);
  const portalUrl = getPortalUrl();
  const mainCollectionUrl = getMainCollectionUrl(theme, category, source);
  const vipGroupUrl = getVipGroupUrl();
  const productList = selectedProducts.map((product, index) => buildProductLine(product, index)).join("\n\n");
  const instagramProductList = selectedProducts.map((product, index) => buildInstagramProductLine(product, index)).join("\n\n");
  const hashtags = getHashtags(source, theme, category);

  if (format === "instagram") {
    return `${title}\n\nSeparei esses produtos porque estao com bom potencial para compra rapida e uso no dia a dia.\n\n${instagramProductList}\n\nLinks oficiais no portal da bio: @vitrine.segura\nEntre no grupo VIP pelo link da bio para receber primeiro.\n\n${hashtags}`;
  }

  if (format === "tiktok") {
    return `Roteiro Reels/TikTok - ${title}\n\nCena 1: abre com o texto \"${title}\".\nCena 2: mostre produto por produto, com preco na tela.\nCena 3: feche com \"links no portal da Vitrine Segura\".\n\nProdutos para mostrar:\n\n${productList}\n\nLegenda curta:\n${title}. Links: ${mainCollectionUrl}\n\n${hashtags}`;
  }

  return `${title}\n${mainCollectionUrl}\n\nSeparei ${selectedProducts.length} oferta(s) para hoje:\n\n${productList}\n\nVeja mais achadinhos no portal:\n${portalUrl}\n\nGrupo VIP:\n${vipGroupUrl}`;
}

function scoreProduct(product: AffiliateProduct, theme: MarketingTheme, clickCountsByProduct: Record<string, number>) {
  const clickScore = (clickCountsByProduct[product.id] || 0) * 10;
  const featuredScore = product.is_featured ? 20 : 0;
  const affiliateScore = product.affiliate_url ? 8 : -40;
  const imageScore = product.image_url ? 4 : -8;
  const cheapScore = product.price <= 50 ? 10 : product.price <= 100 ? 5 : 0;
  const recency = product.created_at ? new Date(product.created_at).getTime() / 100000000000 : 0;

  if (theme === "most_clicked") return clickScore + featuredScore + affiliateScore + imageScore;
  if (theme === "featured") return featuredScore + clickScore + affiliateScore + imageScore;
  if (theme === "up_to_50" || theme === "up_to_100") return cheapScore + clickScore + featuredScore + affiliateScore + imageScore;
  if (theme === "recent") return recency + affiliateScore + imageScore + featuredScore;

  return clickScore + featuredScore + affiliateScore + imageScore;
}

export default function MarketingGenerator({ products, clickCountsByProduct }: MarketingGeneratorProps) {
  const [format, setFormat] = useState<MarketingFormat>("whatsapp");
  const [theme, setTheme] = useState<MarketingTheme>("most_clicked");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(5);
  const [copied, setCopied] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );

  const selectedProducts = useMemo(() => {
    const filtered = products
      .filter((product) => product.is_active)
      .filter((product) => product.affiliate_url)
      .filter((product) => (source === "all" ? true : product.source === source))
      .filter((product) => (theme === "category" && category ? product.category === category : true))
      .filter((product) => (theme === "up_to_50" ? product.price <= 50 : true))
      .filter((product) => (theme === "up_to_100" ? product.price <= 100 : true));

    return filtered
      .sort((a, b) => scoreProduct(b, theme, clickCountsByProduct) - scoreProduct(a, theme, clickCountsByProduct))
      .slice(0, count);
  }, [category, clickCountsByProduct, count, products, source, theme]);

  const message = useMemo(
    () => generateMessage({ format, theme, source, category, selectedProducts }),
    [category, format, selectedProducts, source, theme],
  );

  const selectedImageUrls = useMemo(
    () => selectedProducts.map((product) => product.image_url).filter((url): url is string => Boolean(url)),
    [selectedProducts],
  );

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyLinks() {
    const links = selectedProducts.map((product) => getProductUrl(product.id)).join("\n");
    await navigator.clipboard.writeText(links);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyImageUrls() {
    await navigator.clipboard.writeText(selectedImageUrls.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  function openImages() {
    for (const imageUrl of selectedImageUrls.slice(0, 10)) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  }

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <section id="divulgacao" className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Divulgacao</p>
          <h2 className="text-2xl font-black uppercase text-slate-950">Gerador rapido de posts</h2>
          <p className="text-sm text-slate-500">
            Monte textos prontos para WhatsApp, Instagram e TikTok usando produtos ativos, com afiliado e melhor desempenho.
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
          {selectedProducts.length} produto(s) selecionado(s)
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Canal
          <select value={format} onChange={(event) => setFormat(event.target.value as MarketingFormat)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">Reels/TikTok</option>
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Tema
          <select value={theme} onChange={(event) => setTheme(event.target.value as MarketingTheme)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            {Object.entries(themeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Fonte
          <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={theme !== "category"} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 disabled:bg-slate-100 disabled:text-slate-400">
            <option value="">Escolha uma categoria</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Quantidade
          <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            <option value={3}>3 produtos</option>
            <option value={5}>5 produtos</option>
            <option value={10}>10 produtos</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <textarea
            value={message}
            readOnly
            className="min-h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-900 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyMessage} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
              {copied ? "Copiado" : "Copiar texto"}
            </button>
            <button type="button" onClick={copyLinks} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-xs font-black uppercase text-blue-700">
              Copiar links
            </button>
            <button type="button" onClick={copyImageUrls} disabled={selectedImageUrls.length === 0} className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-black uppercase text-amber-700 disabled:cursor-not-allowed disabled:opacity-40">
              Copiar imagens
            </button>
            <button type="button" onClick={openImages} disabled={selectedImageUrls.length === 0} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
              Abrir imagens
            </button>
            <a href={whatsappShareUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-xs font-black uppercase text-green-700">
              Abrir WhatsApp
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-pink-200 bg-pink-50 px-5 py-3 text-xs font-black uppercase text-pink-700">
              Abrir Instagram
            </a>
            <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase text-slate-700">
              Abrir TikTok
            </a>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="px-1 text-xs font-black uppercase tracking-widest text-slate-500">Produtos usados</h3>
          {selectedProducts.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              Nenhum produto encontrado para esta combinacao. Tente outra fonte, tema ou categoria.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex gap-3 rounded-xl bg-white p-2 shadow-sm">
                  <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] font-black uppercase text-slate-400">Sem img</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-black leading-snug text-slate-900">{product.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{sourceLabels[product.source]} - {formatCurrency(product.price)}</p>
                    <p className="text-[11px] font-bold text-blue-600">{clickCountsByProduct[product.id] || 0} clique(s)</p>
                    {product.image_url ? (
                      <a href={product.image_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-black uppercase text-amber-700">
                        Abrir imagem
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
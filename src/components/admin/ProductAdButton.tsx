"use client";

import { useMemo, useState } from "react";
import type { AffiliateProduct, ProductSource } from "@/types/product";

type AdChannel = "whatsapp" | "instagram" | "tiktok";

type ProductAdButtonProps = {
  product: AffiliateProduct;
  className?: string;
};

const sourceLabels: Record<ProductSource, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  shein: "Shein",
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

function getVipGroupUrl() {
  return "https://chat.whatsapp.com/LxGXGvPyy9NHerUxOD99Aj";
}

function getHashtags(product: AffiliateProduct) {
  const tags = ["#vitrinesegura", "#achadinhos", "#ofertasdodia"];

  if (product.source === "shopee") tags.push("#achadinhosshopee", "#shopee");
  if (product.source === "shein") tags.push("#shein", "#achadinhosshein");
  if (product.source === "mercadolivre") tags.push("#mercadolivre");

  if (product.price <= 50) tags.push("#ate50reais");
  if (product.price <= 100) tags.push("#ate100reais");

  return tags.join(" ");
}

function buildAdText(product: AffiliateProduct, channel: AdChannel) {
  const productUrl = getProductUrl(product.id);
  const vipUrl = getVipGroupUrl();
  const source = sourceLabels[product.source];
  const price = formatCurrency(product.price);
  const hashtags = getHashtags(product);

  if (channel === "instagram") {
    return `Achadinho de hoje na Vitrine Segura\n\n${product.title}\n${price} - ${source}\n\nLink oficial no portal da bio: @vitrine.segura\nEntre no grupo VIP pelo link da bio para receber primeiro.\n\n${hashtags}`;
  }

  if (channel === "tiktok") {
    return `Roteiro Reels/TikTok\n\nCena 1: texto na tela \"Achadinho de hoje\".\nCena 2: mostre o produto e destaque o preco: ${price}.\nCena 3: feche com \"link no portal da Vitrine Segura\".\n\nProduto:\n${product.title}\n${price} - ${source}\n${productUrl}\n\nLegenda curta:\nAchadinho util de hoje. Link no portal: ${productUrl}\n\n${hashtags}`;
  }

  return `Achadinho de hoje na Vitrine Segura\n\n${product.title}\n${price} - ${source}\n\nLink oficial:\n${productUrl}\n\nGrupo VIP:\n${vipUrl}`;
}

export default function ProductAdButton({ product, className }: ProductAdButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<AdChannel>("whatsapp");
  const [copied, setCopied] = useState(false);

  const adText = useMemo(() => buildAdText(product, channel), [channel, product]);
  const productUrl = useMemo(() => getProductUrl(product.id), [product.id]);

  async function copyText() {
    await navigator.clipboard.writeText(adText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyProductLink() {
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyImageUrl() {
    if (!product.image_url) return;

    await navigator.clipboard.writeText(product.image_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        Criar anuncio
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] font-black uppercase text-slate-400">Sem imagem</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Criar anuncio</p>
                  <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-slate-950">{product.title}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{sourceLabels[product.source]} - {formatCurrency(product.price)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50">
                Fechar
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button type="button" onClick={() => setChannel("whatsapp")} className={`rounded-xl border px-4 py-3 text-xs font-black uppercase ${channel === "whatsapp" ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 text-slate-600"}`}>
                WhatsApp
              </button>
              <button type="button" onClick={() => setChannel("instagram")} className={`rounded-xl border px-4 py-3 text-xs font-black uppercase ${channel === "instagram" ? "border-pink-300 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-600"}`}>
                Instagram
              </button>
              <button type="button" onClick={() => setChannel("tiktok")} className={`rounded-xl border px-4 py-3 text-xs font-black uppercase ${channel === "tiktok" ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-200 text-slate-600"}`}>
                Reels/TikTok
              </button>
            </div>

            <textarea
              value={adText}
              readOnly
              className="mt-4 min-h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-900 outline-none"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={copyText} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
                {copied ? "Copiado" : "Copiar texto"}
              </button>
              <button type="button" onClick={copyProductLink} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-xs font-black uppercase text-blue-700">
                Copiar link
              </button>
              <button type="button" onClick={copyImageUrl} disabled={!product.image_url} className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-black uppercase text-amber-700 disabled:cursor-not-allowed disabled:opacity-40">
                Copiar imagem
              </button>
              {product.image_url ? (
                <a href={product.image_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase text-slate-700">
                  Abrir imagem
                </a>
              ) : null}
              <a href={`https://wa.me/?text=${encodeURIComponent(adText)}`} target="_blank" rel="noreferrer" className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-xs font-black uppercase text-green-700">
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Shield, ShoppingBag, Star, Truck } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import ProductGrid from "@/components/ui/ProductGrid";
import SourceBadge from "@/components/ui/SourceBadge";
import { getActiveProductById, getRelatedProducts } from "@/lib/products";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import type { AffiliateProduct } from "@/types/product";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getActiveProductById(id);

  if (!product) {
    return {
      title: "Produto nao encontrado",
    };
  }

  const title = product.title;
  const description = truncateDescription(
    `Produto em ${product.category} por ${product.price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}. Link oficial via Vitrine Segura.`,
  );
  const image = product.image_url || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/produto/${product.id}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/produto/${product.id}`),
      siteName: "Vitrine Segura",
      type: "website",
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
  };
}
function formatCount(value: number | null) {
  if (value === null) {
    return null;
  }

  return value.toLocaleString("pt-BR");
}

function buildProductJsonLd(product: AffiliateProduct, sourceLabel: string) {
  const ratingCount = product.reviews_count ?? product.sold_count;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description:
      product.description ||
      `Oferta em ${product.category} selecionada pela Vitrine Segura.`,
    image: product.image_url ? [product.image_url] : undefined,
    category: product.category,
    sku: product.external_id,
    brand: product.seller_name
      ? {
          "@type": "Brand",
          name: product.seller_name,
        }
      : undefined,
    aggregateRating:
      product.rating && ratingCount
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.toFixed(1),
            reviewCount: ratingCount,
            bestRating: "5",
            worstRating: "1",
          }
        : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/go/${product.id}`),
      priceCurrency: product.currency || "BRL",
      price: product.price.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: product.seller_name || sourceLabel,
      },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getActiveProductById(id);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product, 4);
  const sourceLabel = product.source === "shopee" ? "Shopee" : "Mercado Livre";
  const productJsonLd = buildProductJsonLd(product, sourceLabel);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <header className="bg-[#0F172A] px-4 py-5 text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FFE600]">
            <ArrowLeft className="h-4 w-4" />
            Vitrine Segura
          </Link>
          <SourceBadge source={product.source} />
        </div>
      </header>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="aspect-square rounded-2xl bg-slate-50 p-4">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <ShoppingBag className="h-24 w-24" />
              </div>
            )}
          </div>
        </div>

        <article className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FFE600] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
                {product.category}
              </span>
              {product.is_featured ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Destaque
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              {product.title}
            </h1>

            {product.description ? (
              <p className="text-sm font-medium leading-relaxed text-slate-600 md:text-base">
                {product.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <PriceTag price={product.price} oldPrice={product.old_price} />
          </div>

          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {product.rating ? (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nota</dt>
                <dd className="mt-1 flex items-center gap-1 text-sm font-black text-slate-900">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  {product.rating.toFixed(1)}
                </dd>
              </div>
            ) : null}
            {product.sold_count ? (
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendidos</dt>
                <dd className="mt-1 text-sm font-black text-slate-900">{formatCount(product.sold_count)}</dd>
              </div>
            ) : null}
            {product.seller_name ? (
              <div className="rounded-xl border border-slate-100 bg-white p-3 md:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</dt>
                <dd className="mt-1 truncate text-sm font-black text-slate-900">{product.seller_name}</dd>
              </div>
            ) : null}
          </dl>

          <a
            href={`/go/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-100 active:scale-95"
          >
            Ver oferta na {sourceLabel}
            <ArrowRight className="h-4 w-4" />
          </a>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white p-3 text-[10px] font-black uppercase text-slate-600">
              <Shield className="mx-auto mb-1 h-5 w-5 text-blue-600" />
              Compra segura
            </div>
            <div className="rounded-xl bg-white p-3 text-[10px] font-black uppercase text-slate-600">
              <Truck className="mx-auto mb-1 h-5 w-5 text-blue-600" />
              Envio oficial
            </div>
            <div className="rounded-xl bg-white p-3 text-[10px] font-black uppercase text-slate-600">
              <CheckCircle className="mx-auto mb-1 h-5 w-5 text-blue-600" />
              Link afiliado
            </div>
          </div>
        </article>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="mx-auto max-w-[1200px] px-4 pb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-black uppercase text-slate-950">Produtos relacionados</h2>
            <p className="text-sm font-medium text-slate-500">Mais achadinhos em {product.category}.</p>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      ) : null}
    </main>
  );
}







import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNotice from "@/components/admin/AdminNotice";
import CopyProductLinkButton from "@/components/admin/CopyProductLinkButton";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import ShopeeAffiliateWarning from "@/components/admin/ShopeeAffiliateWarning";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { campaignColumns, normalizeSupabaseCampaign } from "@/lib/campaigns";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { normalizeSupabaseProduct, productColumns } from "@/lib/products";
import type { AffiliateProduct, Campaign, ClickSummary, ProductSource, SearchRule } from "@/types/product";
import {
  checkProductLinks,
  createCampaign,
  createManualProduct,
  deleteCampaign,
  deleteSearchRule,
  deleteSelectedPendingProducts,
  importMercadoLivreProduct,
  importBulkProducts,
  createSearchRule,
  loginAdmin,
  logoutAdmin,
  markProductReviewed,
  publishSelectedProducts,
  searchProductsFromRule,
  toggleProductActive,
  toggleProductFeatured,
  updateAffiliateUrl,
  updateCampaign,
  updateManualProduct,
  updatePendingProductCategories,
  updateSearchRule,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRule(rule: Record<string, unknown>): SearchRule {
  return {
    id: String(rule.id),
    source: rule.source === "shopee" || rule.source === "shein" ? rule.source : "mercadolivre",
    category: String(rule.category),
    query: String(rule.query),
    min_price: toNumber(rule.min_price),
    max_price: toNumber(rule.max_price),
    min_rating: toNumber(rule.min_rating),
    max_results: toNumber(rule.max_results) ?? 20,
    is_active: Boolean(rule.is_active),
    created_at: String(rule.created_at),
  };
}

async function getAdminData() {
  const supabase = createServiceSupabaseClient();

  const [productsResult, rulesResult, clicksResult, campaignsResult, campaignClicksResult] = await Promise.all([
    supabase
      .from("products")
      .select(productColumns)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("search_rules").select("*").order("created_at", { ascending: false }).limit(500),
    supabase
      .from("clicks")
      .select("product_id, source, created_at, products(title)")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("campaigns").select(campaignColumns).order("created_at", { ascending: false }).limit(100),
    supabase.from("campaign_clicks").select("campaign_id, source, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  if (rulesResult.error) {
    throw new Error(rulesResult.error.message);
  }

  if (clicksResult.error) {
    throw new Error(clicksResult.error.message);
  }

  const campaigns = campaignsResult.error ? [] : (campaignsResult.data || []).map((campaign) => normalizeSupabaseCampaign(campaign));
  const campaignClickCounts = new Map<string, number>();

  if (!campaignClicksResult.error) {
    for (const click of campaignClicksResult.data || []) {
      const campaignId = String(click.campaign_id || "");

      if (campaignId) {
        campaignClickCounts.set(campaignId, (campaignClickCounts.get(campaignId) || 0) + 1);
      }
    }
  }

  const products = (productsResult.data || []).map((product) => normalizeSupabaseProduct(product));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const clickMap = new Map<string, ClickSummary>();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let clicksLast7Days = 0;

  for (const click of clicksResult.data || []) {
    const productId = String(click.product_id || "");

    if (!productId) {
      continue;
    }

    const createdAt = click.created_at ? new Date(String(click.created_at)).getTime() : 0;
    const isRecentClick = createdAt >= sevenDaysAgo;

    if (isRecentClick) {
      clicksLast7Days += 1;
    }

    const joinedProduct = Array.isArray(click.products) ? click.products[0] : click.products;
    const savedProduct = productsById.get(productId);
    const title = savedProduct?.title || (joinedProduct && "title" in joinedProduct ? String(joinedProduct.title) : "Produto removido");
    const source: ProductSource = savedProduct?.source || (click.source === "shopee" || click.source === "shein" ? click.source : "mercadolivre");
    const current = clickMap.get(productId);

    if (current) {
      current.clicks += 1;
      current.clicks_last_7_days += isRecentClick ? 1 : 0;
    } else {
      clickMap.set(productId, {
        product_id: productId,
        title,
        source,
        clicks: 1,
        clicks_last_7_days: isRecentClick ? 1 : 0,
        is_featured: Boolean(savedProduct?.is_featured),
      });
    }
  }

  return {
    products,
    clickCountsByProduct: Object.fromEntries(
      Array.from(clickMap.entries()).map(([productId, summary]) => [productId, summary.clicks]),
    ) as Record<string, number>,
    rules: (rulesResult.data || []).map((rule) => normalizeRule(rule)),
    campaigns,
    campaignClickCountsByCampaign: Object.fromEntries(campaignClickCounts.entries()) as Record<string, number>,
    stats: {
      totalProducts: products.length,
      activeProducts: products.filter((product) => product.is_active).length,
      shopeeProducts: products.filter((product) => product.source === "shopee").length,
      mercadoLivreProducts: products.filter((product) => product.source === "mercadolivre").length,
      sheinProducts: products.filter((product) => product.source === "shein").length,
      totalClicks: clicksResult.data?.length || 0,
      clicksLast7Days,
      withoutAffiliate: products.filter((product) => !product.affiliate_url).length,
    },
    clickSummaries: Array.from(clickMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
  };
}
function getSingleParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getTextParam(params: Record<string, string | string[] | undefined>, key: string) {
  return (getSingleParam(params, key) || "").trim();
}

function getProductReturnTo(params: Record<string, string | string[] | undefined>) {
  const queryParams = new URLSearchParams();

  for (const key of ["product_filter", "product_category", "product_query"]) {
    const value = getSingleParam(params, key);

    if (value) {
      queryParams.set(key, value);
    }
  }

  const queryString = queryParams.toString();
  return queryString ? `/admin?${queryString}#produtos-encontrados` : "/admin#produtos-encontrados";
}

function getCategoryOptions(products: AffiliateProduct[]) {
  return Array.from(new Set(products.map((product) => product.category.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const staleReviewDays = 30;
const staleReviewMs = staleReviewDays * 24 * 60 * 60 * 1000;

function getProductReviewTime(product: AffiliateProduct) {
  const reviewedAt = product.last_checked_at || product.created_at;
  const timestamp = reviewedAt ? new Date(reviewedAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function needsCatalogReview(product: AffiliateProduct) {
  return getProductReviewTime(product) < Date.now() - staleReviewMs;
}

function hasForcedReview(product: AffiliateProduct) {
  const reviewedAt = product.last_checked_at ? new Date(product.last_checked_at).getTime() : 0;
  return reviewedAt > 0 && reviewedAt <= new Date("2001-01-01T00:00:00.000Z").getTime();
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Sem revisao";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Sem revisao";
  }

  if (date.getFullYear() <= 2001) {
    return "Precisa revisao";
  }

  return date.toLocaleDateString("pt-BR");
}

type ProductAdminFilter = "all" | "shopee" | "mercadolivre" | "shein" | "without_affiliate" | "featured" | "inactive" | "without_image" | "without_clicks" | "popular_without_featured" | "stale_review";

function getProductAdminFilter(value: string | string[] | undefined): ProductAdminFilter {
  const filter = Array.isArray(value) ? value[0] : value;

  if (
    filter === "shopee" ||
    filter === "mercadolivre" ||
    filter === "shein" ||
    filter === "without_affiliate" ||
    filter === "featured" ||
    filter === "inactive" ||
    filter === "without_image" ||
    filter === "without_clicks" ||
    filter === "popular_without_featured" ||
    filter === "stale_review"
  ) {
    return filter;
  }

  return "all";
}

function filterAdminProducts(
  products: AffiliateProduct[],
  filter: ProductAdminFilter,
  clickCountsByProduct: Record<string, number>,
  categoryFilter: string,
  searchQuery: string,
) {
  let filteredProducts: AffiliateProduct[];

  switch (filter) {
    case "shopee":
      filteredProducts = products.filter((product) => product.source === "shopee");
      break;
    case "mercadolivre":
      filteredProducts = products.filter((product) => product.source === "mercadolivre");
      break;
    case "shein":
      filteredProducts = products.filter((product) => product.source === "shein");
      break;
    case "without_affiliate":
      filteredProducts = products.filter((product) => !product.affiliate_url);
      break;
    case "featured":
      filteredProducts = products.filter((product) => product.is_featured);
      break;
    case "inactive":
      filteredProducts = products.filter((product) => !product.is_active);
      break;
    case "without_image":
      filteredProducts = products.filter((product) => !product.image_url);
      break;
    case "without_clicks":
      filteredProducts = products.filter((product) => !clickCountsByProduct[product.id]);
      break;
    case "popular_without_featured":
      filteredProducts = products.filter((product) => (clickCountsByProduct[product.id] || 0) > 0 && !product.is_featured);
      break;
    case "stale_review":
      filteredProducts = products.filter((product) => needsCatalogReview(product));
      break;
    default:
      filteredProducts = products;
  }

  const normalizedCategory = categoryFilter.trim();
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (normalizedCategory) {
    filteredProducts = filteredProducts.filter((product) => product.category === normalizedCategory);
  }

  if (normalizedQuery) {
    filteredProducts = filteredProducts.filter((product) =>
      normalizeSearchText(`${product.title} ${product.external_id} ${product.seller_name || ""}`).includes(normalizedQuery),
    );
  }

  return filteredProducts;
}

function LoginForm({ hasError }: { hasError: boolean }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <h1 className="text-2xl font-black uppercase tracking-tight">Admin Vitrine Segura</h1>
        <p className="mt-2 text-sm text-slate-300">
          Entre com a senha definida em <code>ADMIN_PASSWORD</code>.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            Senha invalida.
          </p>
        ) : null}

        <form action={loginAdmin} className="mt-6 space-y-4">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
            Senha
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-[#FFE600]"
            />
          </label>
          <button className="w-full rounded-xl bg-[#FFE600] px-4 py-3 text-sm font-black uppercase text-slate-950">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

function RuleForm({ rule }: { rule?: SearchRule }) {
  return (
    <form action={rule ? updateSearchRule : createSearchRule} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
      {rule ? <input type="hidden" name="id" value={rule.id} /> : null}

      <select name="source" defaultValue={rule?.source || "mercadolivre"} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2">
        <option value="mercadolivre">Mercado Livre</option>
        <option value="shopee">Shopee</option>
      </select>
      <input name="category" required defaultValue={rule?.category || ""} placeholder="Categoria" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="query" required defaultValue={rule?.query || ""} placeholder="Busca" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="min_price" type="number" step="0.01" defaultValue={rule?.min_price ?? ""} placeholder="Min R$" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="max_price" type="number" step="0.01" defaultValue={rule?.max_price ?? ""} placeholder="Max R$" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="min_rating" type="number" step="0.1" min="0" max="5" defaultValue={rule?.min_rating ?? ""} placeholder="Aval." className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="max_results" type="number" min="1" max="100" defaultValue={rule?.max_results ?? 20} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-2">
        {rule ? (
          <label className="mr-auto flex items-center gap-2 text-xs font-bold text-slate-600">
            <input name="is_active" type="checkbox" defaultChecked={rule.is_active} />
            Ativa
          </label>
        ) : null}
        <button
          formAction={searchProductsFromRule}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase text-blue-700"
        >
          Buscar
        </button>
        <button className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">
          {rule ? "Salvar" : "Criar"}
        </button>
        {rule ? (
          <button
            formAction={deleteSearchRule}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase text-red-700"
          >
            Excluir
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ProductFields({ product, fixedSource, defaultCategory = "Casa e Decoração", accent = "blue" }: { product?: AffiliateProduct; fixedSource?: ProductSource; defaultCategory?: string; accent?: "blue" | "orange" | "black" }) {
  const selectedSource = fixedSource || product?.source || "mercadolivre";
  const linkAccentClass = accent === "orange"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : accent === "black"
      ? "border-slate-300 bg-slate-50 text-slate-950"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {product ? <input type="hidden" name="current_external_id" value={product.external_id} /> : null}

      {fixedSource ? (
        <>
          <input type="hidden" name="source" value={fixedSource} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black uppercase text-slate-700 md:col-span-2">
            {fixedSource === "mercadolivre" ? "Mercado Livre" : fixedSource === "shopee" ? "Shopee" : "Shein"}
          </div>
        </>
      ) : (
        <select name="source" defaultValue={selectedSource} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2">
          <option value="mercadolivre">Mercado Livre</option>
          <option value="shopee">Shopee</option>
          <option value="shein">Shein</option>
        </select>
      )}
      <input name="external_id" defaultValue={product?.external_id || ""} placeholder="ID externo opcional" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="title" required defaultValue={product?.title || ""} placeholder="Titulo do produto" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-4" />
      <input name="category" list="admin-category-options" required defaultValue={product?.category || defaultCategory} placeholder="Categoria" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="price" required type="number" step="0.01" min="0" defaultValue={product?.price ?? ""} placeholder="Preco" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="old_price" type="number" step="0.01" min="0" defaultValue={product?.old_price ?? ""} placeholder="Preco antigo" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <textarea name="description" defaultValue={product?.description || ""} placeholder="Descricao curta" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-12" />
      <input name="image_url" defaultValue={product?.image_url || ""} placeholder="URL da imagem" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-6" />
      <label className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500 md:col-span-6">
        Link original do produto
        <input name="product_url" required defaultValue={product?.product_url || ""} placeholder="Link do produto na loja" className="mt-1 w-full border-0 p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none placeholder:text-slate-400" />
      </label>
      <label className={`block rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-wider md:col-span-6 ${linkAccentClass}`}>
        Link afiliado oficial
        <input name="affiliate_url" defaultValue={product?.affiliate_url || ""} placeholder="Cole aqui o link gerado no painel de afiliados" className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none placeholder:text-slate-400" />
      </label>
      <ShopeeAffiliateWarning />
      <input name="currency" defaultValue={product?.currency || "BRL"} placeholder="Moeda" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={product?.rating ?? ""} placeholder="Nota" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="reviews_count" type="number" min="0" defaultValue={product?.reviews_count ?? ""} placeholder="Reviews" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="sold_count" type="number" min="0" defaultValue={product?.sold_count ?? ""} placeholder="Vendidos" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="seller_name" defaultValue={product?.seller_name || ""} placeholder="Vendedor" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="seller_reputation" defaultValue={product?.seller_reputation || ""} placeholder="Reputacao" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 md:col-span-1">
        <input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true} />
        Ativo
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 md:col-span-1">
        <input name="is_featured" type="checkbox" defaultChecked={product?.is_featured ?? false} />
        Destaque
      </label>
    </>
  );
}
function ImportMercadoLivreForm() {
  return (
    <form action={importMercadoLivreProduct} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-12">
      <input name="product_url" required placeholder="Cole aqui o link completo do produto Mercado Livre" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-5" />
      <input name="category" list="admin-category-options" required defaultValue="Casa e Decoração" placeholder="Categoria" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="affiliate_url" placeholder="URL afiliada oficial opcional" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-3" />
      <input name="rating" type="number" step="0.1" min="0" max="5" placeholder="Nota opcional" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-1" />
      <label className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 md:col-span-1">
        <input name="is_featured" type="checkbox" />
        Destaque
      </label>
      <div className="md:col-span-12 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs font-medium text-blue-800">
          Mercado Livre: use apenas links oficiais gerados no painel. A contabilizacao pode nao ocorrer em vitrine externa; a lista de recomendacoes do painel e o caminho mais seguro.
        </p>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white">
          Tentar importar Mercado Livre
        </button>
      </div>
    </form>
  );
}
function ShopeeImportForm() {
  return (
    <form action={importBulkProducts} className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-orange-700">Shopee em lote</p>
        <p className="mt-1 text-sm font-semibold text-orange-950">Envie o CSV oficial da Shopee. A categoria padrao sera aplicada aos itens importados.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-orange-700 md:col-span-1">
          Categoria padrao
          <input name="bulk_category" list="admin-category-options" defaultValue="Casa e Decoração" className="mt-1 w-full border-0 p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none" />
        </label>
        <label className="block rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-orange-700 md:col-span-2">
          CSV oficial Shopee
          <input name="bulk_file" type="file" accept=".csv,text/csv" className="mt-1 w-full text-sm font-medium normal-case tracking-normal text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
        </label>
      </div>
      <button className="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black uppercase text-white">
        Importar CSV Shopee
      </button>
    </form>
  );
}

function SheinImportForm() {
  return (
    <form action={importBulkProducts} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-white">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-300">Shein por texto afiliado</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">Cole os blocos copiados do painel Shein. O sistema extrai titulo, preco, vendidos e link afiliado.</p>
      </div>
      <label className="block rounded-xl border border-white/10 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700">
        Categoria padrao
        <input name="bulk_category" list="admin-category-options" defaultValue="Jóias & Relógios" className="mt-1 w-full border-0 p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none" />
      </label>
      <label className="block rounded-xl border border-white/10 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700">
        Texto da oferta Shein
        <textarea
          name="bulk_products"
          rows={7}
          placeholder={"Cole aqui blocos da Shein, por exemplo:\nPreco[R$147,74] -4% Sueter de Trico ... 300+ vendido\nhttps://onelink.shein.com/42/5vjdu621bjgf"}
          className="mt-2 w-full resize-y border-0 p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none placeholder:text-slate-400"
        />
      </label>
      <button className="rounded-xl bg-white px-5 py-3 text-xs font-black uppercase text-slate-950">
        Importar ofertas Shein
      </button>
    </form>
  );
}

function PlatformManualProductForm({ source, title, description, defaultCategory, accent, buttonClass, panelClass, eyebrowClass }: { source: ProductSource; title: string; description: string; defaultCategory: string; accent: "blue" | "orange" | "black"; buttonClass: string; panelClass: string; eyebrowClass: string }) {
  return (
    <form action={createManualProduct} className={`space-y-4 rounded-xl border p-4 ${panelClass}`}>
      <div>
        <p className={`text-xs font-black uppercase tracking-widest ${eyebrowClass}`}>Cadastro manual</p>
        <h3 className="mt-1 text-lg font-black uppercase text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-12">
        <ProductFields fixedSource={source} defaultCategory={defaultCategory} accent={accent} />
        <div className="md:col-span-12">
          <button className={`rounded-xl px-5 py-3 text-xs font-black uppercase ${buttonClass}`}>
            Cadastrar {title}
          </button>
        </div>
      </div>
    </form>
  );
}

function PlatformProductForms() {
  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">Mercado Livre</p>
          <h3 className="mt-1 text-xl font-black uppercase text-slate-950">Cadastro azul</h3>
          <p className="mt-1 text-sm font-semibold text-blue-900">Use links oficiais do painel. A importacao automatica por API segue limitada pelo Mercado Livre.</p>
        </div>
        <ImportMercadoLivreForm />
        <PlatformManualProductForm
          source="mercadolivre"
          title="Mercado Livre"
          description="Para quando a API bloquear a consulta ou voce quiser cadastrar com dados revisados."
          defaultCategory="Casa e Decoração"
          accent="blue"
          panelClass="border-blue-100 bg-white"
          eyebrowClass="text-blue-700"
          buttonClass="bg-blue-600 text-white"
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-700">Shopee</p>
          <h3 className="mt-1 text-xl font-black uppercase text-slate-950">Cadastro laranja</h3>
          <p className="mt-1 text-sm font-semibold text-orange-950">Use API, CSV oficial ou cadastro manual quando quiser curadoria fina.</p>
        </div>
        <ShopeeImportForm />
        <PlatformManualProductForm
          source="shopee"
          title="Shopee"
          description="Use link afiliado oficial quando cadastrar fora da API."
          defaultCategory="Casa e Decoração"
          accent="orange"
          panelClass="border-orange-100 bg-white"
          eyebrowClass="text-orange-700"
          buttonClass="bg-orange-600 text-white"
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-300">Shein</p>
          <h3 className="mt-1 text-xl font-black uppercase text-white">Cadastro preto</h3>
          <p className="mt-1 text-sm font-semibold text-slate-300">Cole ofertas do painel afiliado ou cadastre manualmente. Imagem continua opcional para revisao.</p>
        </div>
        <SheinImportForm />
        <PlatformManualProductForm
          source="shein"
          title="Shein"
          description="Ideal para ofertas com onelink.shein.com e curadoria visual depois."
          defaultCategory="Jóias & Relógios"
          accent="black"
          panelClass="border-white/10 bg-white"
          eyebrowClass="text-slate-500"
          buttonClass="bg-slate-950 text-white"
        />
      </section>
    </div>
  );
}
function CampaignForm({ campaign }: { campaign?: Campaign }) {
  return (
    <form action={campaign ? updateCampaign : createCampaign} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <select name="source" defaultValue={campaign?.source || "shein"} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2">
        <option value="shein">Shein</option>
        <option value="shopee">Shopee</option>
        <option value="mercadolivre">Mercado Livre</option>
      </select>
      <input name="title" required defaultValue={campaign?.title || ""} placeholder="Titulo da campanha" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-4" />
      <input name="coupon_code" defaultValue={campaign?.coupon_code || ""} placeholder="Cupom/codigo opcional" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="campaign_url" required defaultValue={campaign?.campaign_url || ""} placeholder="Link oficial da campanha" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-4" />
      <textarea name="description" defaultValue={campaign?.description || ""} placeholder="Descricao curta" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-8" />
      <input name="image_url" defaultValue={campaign?.image_url || ""} placeholder="Imagem opcional" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-4" />
      <div className="flex flex-wrap items-center gap-3 md:col-span-12">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
          <input name="is_active" type="checkbox" defaultChecked={campaign?.is_active ?? true} />
          Ativa
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
          <input name="is_featured" type="checkbox" defaultChecked={campaign?.is_featured ?? false} />
          Destaque
        </label>
        <button className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
          {campaign ? "Salvar campanha" : "Cadastrar campanha"}
        </button>
        {campaign ? (
          <button formAction={deleteCampaign} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-xs font-black uppercase text-red-700">
            Excluir
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CampaignsPanel({ campaigns, clickCounts }: { campaigns: Campaign[]; clickCounts: Record<string, number> }) {
  return (
    <section id="campanhas" className="scroll-mt-6 space-y-4">
      <div>
        <h2 className="text-xl font-black uppercase">Campanhas</h2>
        <p className="text-sm text-slate-500">Cadastre cards manuais para colecoes e campanhas oficiais da Shein e Shopee.</p>
      </div>
      <CampaignForm />
      <div className="grid gap-3 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{campaign.source}</p>
                <h3 className="font-black text-slate-950">{campaign.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
                <span className={campaign.is_active ? "rounded-full bg-green-50 px-2 py-1 text-green-700" : "rounded-full bg-red-50 px-2 py-1 text-red-700"}>
                  {campaign.is_active ? "Ativa" : "Inativa"}
                </span>
                {campaign.is_featured ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Destaque</span> : null}
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{clickCounts[campaign.id] || 0} cliques</span>
              </div>
            </div>
            <CampaignForm campaign={campaign} />
          </div>
        ))}
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 lg:col-span-2">
            Nenhuma campanha cadastrada ainda.
          </p>
        ) : null}
      </div>
    </section>
  );
}
function AdminStats({ stats }: { stats: Awaited<ReturnType<typeof getAdminData>>["stats"] }) {
  const items = [
    { label: "Produtos", value: stats.totalProducts },
    { label: "Ativos", value: stats.activeProducts },
    { label: "Mercado Livre", value: stats.mercadoLivreProducts },
    { label: "Shopee", value: stats.shopeeProducts },
    { label: "Shein", value: stats.sheinProducts },
    { label: "Cliques 7 dias", value: stats.clicksLast7Days },
    { label: "Sem afiliado", value: stats.withoutAffiliate, tone: "warning" },
    { label: "Cliques totais", value: stats.totalClicks },
  ];

  return (
    <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
      {items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 rounded-lg border px-3 py-2 shadow-sm ${
            item.tone === "warning" && item.value > 0
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
          <p className={`mt-1 text-xl font-black leading-none ${item.tone === "warning" && item.value > 0 ? "text-amber-700" : "text-slate-950"}`}>{item.value}</p>
        </div>
      ))}
    </section>
  );
}

function ProductFilterTabs({
  selectedFilter,
  products,
  clickCountsByProduct,
  selectedCategory,
  searchQuery,
}: {
  selectedFilter: ProductAdminFilter;
  products: AffiliateProduct[];
  clickCountsByProduct: Record<string, number>;
  selectedCategory: string;
  searchQuery: string;
}) {
  const filters: Array<{ id: ProductAdminFilter; label: string; count: number; tone?: "warning" }> = [
    { id: "all", label: "Todos", count: products.length },
    { id: "shopee", label: "Shopee", count: products.filter((product) => product.source === "shopee").length },
    { id: "shein", label: "Shein", count: products.filter((product) => product.source === "shein").length },
    {
      id: "mercadolivre",
      label: "Mercado Livre",
      count: products.filter((product) => product.source === "mercadolivre").length,
    },
    {
      id: "without_affiliate",
      label: "Sem afiliado",
      count: products.filter((product) => !product.affiliate_url).length,
      tone: "warning",
    },
    { id: "featured", label: "Destaques", count: products.filter((product) => product.is_featured).length },
    { id: "inactive", label: "Inativos", count: products.filter((product) => !product.is_active).length },
    { id: "stale_review", label: "Revisar 30 dias", count: products.filter((product) => needsCatalogReview(product)).length, tone: "warning" },
    { id: "without_image", label: "Sem imagem", count: products.filter((product) => !product.image_url).length, tone: "warning" },
    { id: "without_clicks", label: "Sem cliques", count: products.filter((product) => !clickCountsByProduct[product.id]).length },
    {
      id: "popular_without_featured",
      label: "Clicados sem destaque",
      count: products.filter((product) => (clickCountsByProduct[product.id] || 0) > 0 && !product.is_featured).length,
      tone: "warning",
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Filtros de produtos do admin">
      {filters.map((filter) => {
        const isActive = selectedFilter === filter.id;
        const queryParams = new URLSearchParams();

        if (filter.id !== "all") {
          queryParams.set("product_filter", filter.id);
        }

        if (selectedCategory) {
          queryParams.set("product_category", selectedCategory);
        }

        if (searchQuery) {
          queryParams.set("product_query", searchQuery);
        }

        const href = queryParams.toString() ? `/admin?${queryParams.toString()}` : "/admin";

        return (
          <Link
            key={filter.id}
            href={href}
            scroll={false}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
              isActive
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : filter.tone === "warning" && filter.count > 0
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{filter.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {filter.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function ProductSearchFilters({
  categories,
  selectedFilter,
  selectedCategory,
  searchQuery,
  filteredCount,
}: {
  categories: string[];
  selectedFilter: ProductAdminFilter;
  selectedCategory: string;
  searchQuery: string;
  filteredCount: number;
}) {
  const clearParams = new URLSearchParams();

  if (selectedFilter !== "all") {
    clearParams.set("product_filter", selectedFilter);
  }

  const clearHref = clearParams.toString() ? `/admin?${clearParams.toString()}` : "/admin";

  return (
    <form action="/admin#produtos-encontrados" method="get" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-12">
      {selectedFilter !== "all" ? <input type="hidden" name="product_filter" value={selectedFilter} /> : null}
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 md:col-span-4">
        Categoria
        <select
          name="product_category"
          defaultValue={selectedCategory}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-blue-300"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 md:col-span-5">
        Buscar por nome
        <input
          name="product_query"
          defaultValue={searchQuery}
          placeholder="Digite parte do titulo, vendedor ou ID"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-blue-300"
        />
      </label>
      <div className="flex flex-col gap-2 md:col-span-3 md:flex-row md:items-end md:justify-end">
        <button className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">
          Filtrar
        </button>
        <Link href={clearHref} scroll={false} className="rounded-lg border border-slate-200 px-4 py-2 text-center text-xs font-black uppercase text-slate-600 hover:bg-slate-50">
          Limpar
        </Link>
      </div>
      <p className="text-xs font-semibold text-slate-500 md:col-span-12">
        {filteredCount} produto(s) encontrados nessa combinacao de filtros.
      </p>
    </form>
  );
}
function GrowthReportPanel({ products }: { products: AffiliateProduct[] }) {
  const target = 100;
  const sourceItems = [
    {
      label: "Mercado Livre",
      count: products.filter((product) => product.source === "mercadolivre").length,
      color: "bg-blue-600",
      badge: "bg-blue-50 text-blue-700",
    },
    {
      label: "Shopee",
      count: products.filter((product) => product.source === "shopee").length,
      color: "bg-orange-500",
      badge: "bg-orange-50 text-orange-700",
    },
    {
      label: "Shein",
      count: products.filter((product) => product.source === "shein").length,
      color: "bg-pink-500",
      badge: "bg-pink-50 text-pink-700",
    },
  ];
  const categories = Array.from(
    products.reduce((map, product) => map.set(product.category, (map.get(product.category) || 0) + 1), new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-xl font-black uppercase">Relatorio de crescimento</h2>
        <p className="text-sm text-slate-500">Acompanhe a meta inicial de 100 produtos por plataforma e a distribuicao por categoria.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sourceItems.map((item) => {
          const progress = Math.min(100, Math.round((item.count / target) * 100));

          return (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">{item.count} de {target} produtos</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${item.badge}`}>{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorias</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([category, count]) => (
            <div key={category} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="min-w-0 truncate text-xs font-bold text-slate-700">{category}</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function CatalogMaintenancePanel({
  products,
  clickCountsByProduct,
}: {
  products: AffiliateProduct[];
  clickCountsByProduct: Record<string, number>;
}) {
  const withoutAffiliate = products.filter((product) => !product.affiliate_url);
  const withoutImage = products.filter((product) => !product.image_url);
  const withoutClicks = products.filter((product) => !clickCountsByProduct[product.id]);
  const popularWithoutFeatured = products.filter((product) => (clickCountsByProduct[product.id] || 0) > 0 && !product.is_featured);
  const inactive = products.filter((product) => !product.is_active);
  const staleReview = products.filter((product) => needsCatalogReview(product));

  const items: Array<{
    label: string;
    value: number;
    href: string;
    description: string;
    tone?: "warning" | "danger" | "success";
  }> = [
    {
      label: "Sem afiliado",
      value: withoutAffiliate.length,
      href: "/admin?product_filter=without_affiliate",
      description: "Produtos que podem vender sem gerar comissao.",
      tone: withoutAffiliate.length > 0 ? "danger" : "success",
    },
    {
      label: "Sem imagem",
      value: withoutImage.length,
      href: "/admin?product_filter=without_image",
      description: "Produtos com card fraco ou quebrado visualmente.",
      tone: withoutImage.length > 0 ? "warning" : "success",
    },
    {
      label: "Sem cliques",
      value: withoutClicks.length,
      href: "/admin?product_filter=without_clicks",
      description: "Candidatos a trocar titulo, imagem, categoria ou desativar.",
    },
    {
      label: "Clicados sem destaque",
      value: popularWithoutFeatured.length,
      href: "/admin?product_filter=popular_without_featured",
      description: "Produtos com tracao que podem virar destaque.",
      tone: popularWithoutFeatured.length > 0 ? "warning" : "success",
    },
    {
      label: "Inativos",
      value: inactive.length,
      href: "/admin?product_filter=inactive",
      description: "Itens fora do site publico aguardando decisao.",
    },
    {
      label: "Revisar 30 dias",
      value: staleReview.length,
      href: "/admin?product_filter=stale_review",
      description: "Produtos sem conferencia recente de preco, link e imagem.",
      tone: staleReview.length > 0 ? "warning" : "success",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black uppercase">Manutencao do catalogo</h2>
        <p className="text-sm text-slate-500">Fila pratica para revisar produtos antes das APIs oficiais.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            scroll={false}
            className={`rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              item.tone === "danger"
                ? "border-red-200 hover:border-red-300"
                : item.tone === "warning"
                  ? "border-amber-200 hover:border-amber-300"
                  : item.tone === "success"
                    ? "border-green-200 hover:border-green-300"
                    : "border-slate-200 hover:border-blue-200"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
function PublishQueue({ products, returnTo }: { products: AffiliateProduct[]; returnTo: string }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-green-200 bg-green-50/60 p-5 text-sm text-green-800">
        Nenhum produto aguardando publicacao neste filtro.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black uppercase text-slate-950">Aguardando publicacao</h3>
          <p className="text-sm text-amber-800">
            Produtos novos da automacao entram aqui. Selecione os que devem aparecer no site.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-amber-700 shadow-sm">
          {products.length} pendente(s)
        </span>
      </div>

      <form action={publishSelectedProducts} className="mt-4 space-y-4">
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="grid gap-3 lg:grid-cols-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex gap-3 rounded-xl border border-amber-100 bg-white p-3 shadow-sm transition hover:border-amber-300"
            >
              <input type="hidden" name="pending_product_id" value={product.id} />
              <input type="checkbox" name="product_id" value={product.id} className="mt-5 h-4 w-4 rounded border-slate-300" />
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-14 w-14 flex-none rounded-lg object-contain" />
              ) : (
                <span className="h-14 w-14 flex-none rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-950">{product.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{product.source}</span>
                  <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{formatCurrency(product.price)}</span>
                  {!product.affiliate_url ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Sem afiliado</span>
                  ) : null}
                </div>
                <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Categoria
                  <input
                    name={`category_${product.id}`}
                    list="admin-category-options"
                    defaultValue={product.category}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold normal-case tracking-normal text-slate-950"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
            Publicar selecionados
          </button>
          <button
            formAction={updatePendingProductCategories}
            className="rounded-xl border border-amber-300 bg-white px-5 py-3 text-xs font-black uppercase text-amber-700"
          >
            Salvar categorias
          </button>
          <button
            formAction={deleteSelectedPendingProducts}
            className="rounded-xl border border-red-200 bg-white px-5 py-3 text-xs font-black uppercase text-red-700"
          >
            Excluir selecionados
          </button>
        </div>
      </form>
    </section>
  );
}
function ProductsTable({
  products,
  clickCountsByProduct,
  emptyMessage = "Nenhum produto salvo no Supabase ainda.",
  returnTo,
}: {
  products: AffiliateProduct[];
  clickCountsByProduct: Record<string, number>;
  emptyMessage?: string;
  returnTo: string;
}) {
  if (products.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {products.map((product) => {
        const clickCount = clickCountsByProduct[product.id] || 0;
        const reviewLabel = formatShortDate(product.last_checked_at || product.created_at);

        return (
          <article
            key={product.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${!product.affiliate_url ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-200"}`}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] xl:items-start">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="px-2 text-center text-[10px] font-black uppercase text-slate-400">Sem imagem</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{product.source}</span>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">{product.is_active ? "Ativo" : "Inativo"}</span>
                    <span className={product.is_featured ? "rounded-full bg-amber-50 px-2.5 py-1 text-amber-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-500"}>
                      {product.is_featured ? "Destaque" : "Normal"}
                    </span>
                    {needsCatalogReview(product) || hasForcedReview(product) ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Precisa revisao</span>
                    ) : null}
                    {!product.affiliate_url ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Sem afiliado</span>
                    ) : null}
                    {clickCount > 0 ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{clickCount} cliques</span>
                    ) : null}
                  </div>

                  <h4 className="mt-2 line-clamp-2 text-base font-black leading-snug text-slate-950">{product.title}</h4>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                    <span>{product.category}</span>
                    <span className="font-black text-slate-950">{formatCurrency(product.price)}</span>
                    <span>ID: {product.external_id}</span>
                    <span>Rev. {reviewLabel}</span>
                  </div>

                  {!product.affiliate_url ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      Sem afiliado: o botao de compra usa o link original e pode nao gerar comissao.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <form action={updateAffiliateUrl} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="id" value={product.id} />
                  <input
                    name="affiliate_url"
                    defaultValue={product.affiliate_url || ""}
                    placeholder="URL afiliada oficial"
                    className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${product.affiliate_url ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50"}`}
                  />
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white">Salvar</button>
                </form>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                  <CopyProductLinkButton
                    productId={product.id}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
                  />
                  <form action={toggleProductActive}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="is_active" value={String(product.is_active)} />
                    <button className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-100">
                      {product.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action={checkProductLinks}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="id" value={product.id} />
                    <button className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-black uppercase text-green-700 hover:bg-green-50">
                      Verificar links
                    </button>
                  </form>
                  <form action={markProductReviewed}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="id" value={product.id} />
                    <button className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase text-blue-700 hover:bg-blue-50">
                      Revisado
                    </button>
                  </form>
                  <form action={toggleProductFeatured}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="is_featured" value={String(product.is_featured)} />
                    <button className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-black uppercase text-amber-700 hover:bg-amber-50">
                      {product.is_featured ? "Remover destaque" : "Destacar"}
                    </button>
                  </form>
                  <DeleteProductButton
                    productId={product.id}
                    productTitle={product.title}
                    clickCount={clickCount}
                    returnTo={returnTo}
                  />
                </div>
              </div>
            </div>

            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500">
                Editar detalhes do produto
              </summary>
              <form action={updateManualProduct} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
                <input type="hidden" name="return_to" value={returnTo} />
                <ProductFields product={product} />
                <div className="md:col-span-12">
                  <button className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
                    Salvar produto
                  </button>
                </div>
              </form>
            </details>
          </article>
        );
      })}
    </div>
  );
}
export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const noticeError = getSingleParam(params, "notice_error") || getSingleParam(params, "import_error");
  const noticeSuccess = getSingleParam(params, "notice_success") || getSingleParam(params, "import_success");
  const selectedProductFilter = getProductAdminFilter(params.product_filter);
  const selectedProductCategory = getTextParam(params, "product_category");
  const productSearchQuery = getTextParam(params, "product_query");
  const productReturnTo = getProductReturnTo(params);

  if (!(await isAdminAuthenticated())) {
    return <LoginForm hasError={params.error === "invalid-password"} />;
  }

  let data: Awaited<ReturnType<typeof getAdminData>>;

  try {
    data = await getAdminData();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Supabase service credentials")) {
      redirect("/");
    }

    throw error;
  }

  const categoryOptions = getCategoryOptions(data.products);
  const filteredProducts = filterAdminProducts(
    data.products,
    selectedProductFilter,
    data.clickCountsByProduct,
    selectedProductCategory,
    productSearchQuery,
  );
  const pendingProducts = filteredProducts.filter((product) => !product.is_active);
  const publishedProducts = filteredProducts.filter((product) => product.is_active);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-6 rounded-2xl bg-slate-950 p-6 text-white lg:flex-row lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="h-auto w-44 max-w-full rounded-xl border border-white/10 bg-white/5 p-3" />
            <div>
              <h1 className="text-3xl font-black uppercase md:text-4xl">Painel admin</h1>
              <p className="mt-1 text-sm text-slate-300 md:text-base">Produtos, regras de busca e cliques.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href="/api/auth/mercadolivre/start"
              className="rounded-xl bg-[#FFE600] px-4 py-2 text-xs font-black uppercase text-slate-950"
            >
              Conectar Mercado Livre
            </a>
            <form action={logoutAdmin}>
              <button className="rounded-xl border border-white/20 px-4 py-2 text-xs font-black uppercase text-white">
                Sair
              </button>
            </form>
          </div>
        </header>

        <AdminNotice key={noticeError || noticeSuccess || "admin-notice"} error={noticeError} success={noticeSuccess} />

        <datalist id="admin-category-options">
          {categoryOptions.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <AdminStats stats={data.stats} />

        <CampaignsPanel campaigns={data.campaigns} clickCounts={data.campaignClickCountsByCampaign} />

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black uppercase tracking-wide">Mercado Livre em modo curadoria</p>
          <p className="mt-1 font-medium">Use apenas links oficiais gerados no painel de afiliados. O proprio suporte informou que a contabilizacao pode nao ocorrer em vitrine externa; a lista de recomendacoes do painel e o caminho mais seguro.</p>
        </section>

        <CatalogMaintenancePanel
          products={data.products}
          clickCountsByProduct={data.clickCountsByProduct}
        />

        <GrowthReportPanel products={data.products} />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Cadastrar por plataforma</h2>
            <p className="text-sm text-slate-500">Cada plataforma tem seu proprio fluxo, cor e cuidado de afiliacao. Os produtos publicados continuam na lista unica abaixo.</p>
          </div>
          <PlatformProductForms />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Regras de busca</h2>
            <p className="text-sm text-slate-500">Shopee busca por palavra-chave usando a API. Mercado Livre e Shein devem ser mantidos por curadoria manual com links oficiais.</p>
          </div>
          <RuleForm />
          <div className="space-y-3">
            {data.rules.map((rule) => (
              <RuleForm key={rule.id} rule={rule} />
            ))}
            {data.rules.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                Nenhuma regra cadastrada ainda.
              </p>
            ) : null}
          </div>
        </section>

        <section id="produtos-encontrados" className="scroll-mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Produtos encontrados</h2>
            <p className="text-sm text-slate-500">Filtre por fonte, afiliado, destaque ou status antes de editar.</p>
          </div>
          <ProductFilterTabs
            selectedFilter={selectedProductFilter}
            products={data.products}
            clickCountsByProduct={data.clickCountsByProduct}
            selectedCategory={selectedProductCategory}
            searchQuery={productSearchQuery}
          />
          <ProductSearchFilters
            categories={categoryOptions}
            selectedFilter={selectedProductFilter}
            selectedCategory={selectedProductCategory}
            searchQuery={productSearchQuery}
            filteredCount={filteredProducts.length}
          />
          <PublishQueue products={pendingProducts} returnTo={productReturnTo} />
          <div>
            <h3 className="text-lg font-black uppercase">Produtos publicados</h3>
            <p className="text-sm text-slate-500">
              {publishedProducts.length} produto(s) visivel(is) no site dentro deste filtro.
            </p>
          </div>
          <ProductsTable
            products={publishedProducts}
            clickCountsByProduct={data.clickCountsByProduct}
            emptyMessage="Nenhum produto publicado nesse filtro."
            returnTo={productReturnTo}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Mais clicados</h2>
            <p className="text-sm text-slate-500">Ranking gerado pela rota /go/[id].</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {data.clickSummaries.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum clique registrado ainda.</p>
            ) : (
              <ol className="space-y-3">
                {data.clickSummaries.map((item, index) => (
                  <li key={item.product_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">#{index + 1}</span>
                          <p className="font-bold text-slate-900">{item.title}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide">
                          <span className="rounded-full bg-white px-2 py-1 text-slate-500">{item.source}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{item.clicks} totais</span>
                          <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{item.clicks_last_7_days} em 7 dias</span>
                          {item.is_featured ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Destacado</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link
                          href={`/produto/${item.product_id}`}
                          target="_blank"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-100"
                        >
                          Abrir produto
                        </Link>
                        <CopyProductLinkButton
                          productId={item.product_id}
                          label="Copiar link"
                          className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
                        />
                        {item.is_featured ? null : (
                          <form action={toggleProductFeatured}>
                            <input type="hidden" name="return_to" value={productReturnTo} />
                            <input type="hidden" name="id" value={item.product_id} />
                            <input type="hidden" name="is_featured" value="false" />
                            <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase text-amber-700 hover:bg-amber-100">
                              Destacar
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

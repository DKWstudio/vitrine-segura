import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNotice from "@/components/admin/AdminNotice";
import CopyProductLinkButton from "@/components/admin/CopyProductLinkButton";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { normalizeSupabaseProduct, productColumns } from "@/lib/products";
import type { AffiliateProduct, ClickSummary, ProductSource, SearchRule } from "@/types/product";
import {
  createManualProduct,
  importMercadoLivreProduct,
  createSearchRule,
  loginAdmin,
  logoutAdmin,
  toggleProductActive,
  toggleProductFeatured,
  updateAffiliateUrl,
  updateManualProduct,
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
    source: rule.source === "shopee" ? "shopee" : "mercadolivre",
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

  const [productsResult, rulesResult, clicksResult] = await Promise.all([
    supabase
      .from("products")
      .select(productColumns)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("search_rules").select("*").order("created_at", { ascending: false }).limit(80),
    supabase
      .from("clicks")
      .select("product_id, source, created_at, products(title)")
      .order("created_at", { ascending: false })
      .limit(2000),
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

  const clickMap = new Map<string, ClickSummary>();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let clicksLast7Days = 0;

  for (const click of clicksResult.data || []) {
    const productId = String(click.product_id || "");

    if (!productId) {
      continue;
    }

    const createdAt = click.created_at ? new Date(String(click.created_at)).getTime() : 0;

    if (createdAt >= sevenDaysAgo) {
      clicksLast7Days += 1;
    }

    const product = Array.isArray(click.products) ? click.products[0] : click.products;
    const title = product && "title" in product ? String(product.title) : "Produto removido";
    const source: ProductSource = click.source === "shopee" ? "shopee" : "mercadolivre";
    const current = clickMap.get(productId);

    if (current) {
      current.clicks += 1;
    } else {
      clickMap.set(productId, { product_id: productId, title, source, clicks: 1 });
    }
  }

  const products = (productsResult.data || []).map((product) => normalizeSupabaseProduct(product));

  return {
    products,
    clickCountsByProduct: Object.fromEntries(
      Array.from(clickMap.entries()).map(([productId, summary]) => [productId, summary.clicks]),
    ) as Record<string, number>,
    rules: (rulesResult.data || []).map((rule) => normalizeRule(rule)),
    stats: {
      totalProducts: products.length,
      activeProducts: products.filter((product) => product.is_active).length,
      shopeeProducts: products.filter((product) => product.source === "shopee").length,
      mercadoLivreProducts: products.filter((product) => product.source === "mercadolivre").length,
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

type ProductAdminFilter = "all" | "shopee" | "mercadolivre" | "without_affiliate" | "featured" | "inactive";

function getProductAdminFilter(value: string | string[] | undefined): ProductAdminFilter {
  const filter = Array.isArray(value) ? value[0] : value;

  if (
    filter === "shopee" ||
    filter === "mercadolivre" ||
    filter === "without_affiliate" ||
    filter === "featured" ||
    filter === "inactive"
  ) {
    return filter;
  }

  return "all";
}

function filterAdminProducts(products: AffiliateProduct[], filter: ProductAdminFilter) {
  switch (filter) {
    case "shopee":
      return products.filter((product) => product.source === "shopee");
    case "mercadolivre":
      return products.filter((product) => product.source === "mercadolivre");
    case "without_affiliate":
      return products.filter((product) => !product.affiliate_url);
    case "featured":
      return products.filter((product) => product.is_featured);
    case "inactive":
      return products.filter((product) => !product.is_active);
    default:
      return products;
  }
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
      <input name="query" required defaultValue={rule?.query || ""} placeholder="Busca" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
      <input name="min_price" type="number" step="0.01" defaultValue={rule?.min_price ?? ""} placeholder="Min R$" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="max_price" type="number" step="0.01" defaultValue={rule?.max_price ?? ""} placeholder="Max R$" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="min_rating" type="number" step="0.1" min="0" max="5" defaultValue={rule?.min_rating ?? ""} placeholder="Aval." className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="max_results" type="number" min="1" max="100" defaultValue={rule?.max_results ?? 20} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <div className="flex items-center justify-between gap-3 md:col-span-1">
        {rule ? (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input name="is_active" type="checkbox" defaultChecked={rule.is_active} />
            Ativa
          </label>
        ) : null}
        <button className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">
          {rule ? "Salvar" : "Criar"}
        </button>
      </div>
    </form>
  );
}

function ProductFields({ product }: { product?: AffiliateProduct }) {
  return (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {product ? <input type="hidden" name="current_external_id" value={product.external_id} /> : null}

      <select name="source" defaultValue={product?.source || "mercadolivre"} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2">
        <option value="mercadolivre">Mercado Livre</option>
        <option value="shopee">Shopee</option>
      </select>
      <input name="external_id" defaultValue={product?.external_id || ""} placeholder="ID externo opcional" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="title" required defaultValue={product?.title || ""} placeholder="Titulo do produto" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-4" />
      <input name="category" required defaultValue={product?.category || "Casa"} placeholder="Categoria" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="price" required type="number" step="0.01" min="0" defaultValue={product?.price ?? ""} placeholder="Preco" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <input name="old_price" type="number" step="0.01" min="0" defaultValue={product?.old_price ?? ""} placeholder="Preco antigo" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" />
      <textarea name="description" defaultValue={product?.description || ""} placeholder="Descricao curta" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-12" />
      <input name="image_url" defaultValue={product?.image_url || ""} placeholder="URL da imagem" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-6" />
      <label className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500 md:col-span-6">
        Link original do produto
        <input name="product_url" required defaultValue={product?.product_url || ""} placeholder="Link do produto na loja" className="mt-1 w-full border-0 p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none placeholder:text-slate-400" />
      </label>
      <label className="block rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 md:col-span-6">
        Link afiliado oficial
        <input name="affiliate_url" defaultValue={product?.affiliate_url || ""} placeholder="Cole aqui o link gerado no painel de afiliados" className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none placeholder:text-blue-400" />
      </label>
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
      <input name="category" required defaultValue="Casa" placeholder="Categoria" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-2" />
      <input name="affiliate_url" placeholder="URL afiliada oficial opcional" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-3" />
      <input name="rating" type="number" step="0.1" min="0" max="5" placeholder="Nota opcional" className="rounded-lg border border-blue-200 px-3 py-2 text-sm md:col-span-1" />
      <label className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 md:col-span-1">
        <input name="is_featured" type="checkbox" />
        Destaque
      </label>
      <div className="md:col-span-12 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs font-medium text-blue-800">
          Use link completo com ID MLB. Links curtos como mercadolivre.com/sec podem nao funcionar.
        </p>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white">
          Importar dados do Mercado Livre
        </button>
      </div>
    </form>
  );
}
function ManualProductForm() {
  return (
    <form action={createManualProduct} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-950 md:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-700">Shopee manual</p>
          <p className="mt-1 font-semibold">Use source Shopee e cole o link afiliado gerado no painel da Shopee.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-700">Link original</p>
          <p className="mt-1 font-medium">Pode ser o link normal do produto na Shopee, usado apenas como fallback.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-700">Link afiliado</p>
          <p className="mt-1 font-medium">E o link principal de saida. Ele sera usado pela rota /go/[id].</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <ProductFields />
        <div className="md:col-span-12">
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white">
            Cadastrar produto
          </button>
        </div>
      </div>
    </form>
  );
}
function AdminStats({ stats }: { stats: Awaited<ReturnType<typeof getAdminData>>["stats"] }) {
  const items = [
    { label: "Produtos", value: stats.totalProducts },
    { label: "Ativos", value: stats.activeProducts },
    { label: "Mercado Livre", value: stats.mercadoLivreProducts },
    { label: "Shopee", value: stats.shopeeProducts },
    { label: "Cliques 7 dias", value: stats.clicksLast7Days },
    { label: "Sem afiliado", value: stats.withoutAffiliate, tone: "warning" },
    { label: "Cliques totais", value: stats.totalClicks },
  ];

  return (
    <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
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
}: {
  selectedFilter: ProductAdminFilter;
  products: AffiliateProduct[];
}) {
  const filters: Array<{ id: ProductAdminFilter; label: string; count: number; tone?: "warning" }> = [
    { id: "all", label: "Todos", count: products.length },
    { id: "shopee", label: "Shopee", count: products.filter((product) => product.source === "shopee").length },
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
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Filtros de produtos do admin">
      {filters.map((filter) => {
        const isActive = selectedFilter === filter.id;
        const href = filter.id === "all" ? "/admin" : `/admin?product_filter=${filter.id}`;

        return (
          <Link
            key={filter.id}
            href={href}
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
function ProductsTable({
  products,
  clickCountsByProduct,
  emptyMessage = "Nenhum produto salvo no Supabase ainda.",
}: {
  products: AffiliateProduct[];
  clickCountsByProduct: Record<string, number>;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="p-3">Produto</th>
            <th className="p-3">Fonte</th>
            <th className="p-3">Preco</th>
            <th className="p-3">Status</th>
            <th className="p-3">Afiliado rapido</th>
            <th className="p-3">Acoes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <Fragment key={product.id}>
              <tr key={product.id} className={`align-top ${!product.affiliate_url ? "bg-amber-50/45" : ""}`}>
                <td className="p-3">
                  <div className="flex gap-3">
                    {product.image_url ? <img src={product.image_url} alt="" className="h-14 w-14 rounded-lg object-contain" /> : null}
                    <div>
                      <p className="max-w-sm font-bold text-slate-900">{product.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{product.external_id}</p>
                      {!product.affiliate_url ? (
                        <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                          Sem link afiliado
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-xs font-bold uppercase text-slate-500">{product.source}</td>
                <td className="p-3 font-black">{formatCurrency(product.price)}</td>
                <td className="p-3 text-xs font-bold">
                  <span className={product.is_active ? "text-green-700" : "text-red-700"}>{product.is_active ? "Ativo" : "Inativo"}</span>
                  <br />
                  <span className={product.is_featured ? "text-amber-600" : "text-slate-400"}>{product.is_featured ? "Destaque" : "Normal"}</span>
                </td>
                <td className="p-3">
                  <form action={updateAffiliateUrl} className="flex min-w-72 gap-2">
                    <input type="hidden" name="id" value={product.id} />
                    <input name="affiliate_url" defaultValue={product.affiliate_url || ""} placeholder="URL afiliada oficial" className={`w-full rounded-lg border px-3 py-2 text-xs ${product.affiliate_url ? "border-slate-200" : "border-amber-300 bg-amber-50"}`} />
                    <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white">Salvar</button>
                  </form>
                  {!product.affiliate_url ? (
                    <p className="mt-2 max-w-xs text-[11px] font-semibold text-amber-700">
                      Sem afiliado: o botao de compra usa o link original e pode nao gerar comissao.
                    </p>
                  ) : null}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-2">
                    <CopyProductLinkButton productId={product.id} />
                    <form action={toggleProductActive}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="is_active" value={String(product.is_active)} />
                      <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase text-slate-700">
                        {product.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action={toggleProductFeatured}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="is_featured" value={String(product.is_featured)} />
                      <button className="w-full rounded-lg border border-amber-200 px-3 py-2 text-xs font-black uppercase text-amber-700">
                        {product.is_featured ? "Remover destaque" : "Destacar"}
                      </button>
                    </form>
                    <DeleteProductButton
                      productId={product.id}
                      productTitle={product.title}
                      clickCount={clickCountsByProduct[product.id] || 0}
                    />
                  </div>
                </td>
              </tr>
              <tr key={`${product.id}-edit`}>
                <td colSpan={6} className="bg-slate-50 p-3">
                  <details>
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500">
                      Editar detalhes do produto
                    </summary>
                    <form action={updateManualProduct} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
                      <ProductFields product={product} />
                      <div className="md:col-span-12">
                        <button className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white">
                          Salvar produto
                        </button>
                      </div>
                    </form>
                  </details>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
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

  const filteredProducts = filterAdminProducts(data.products, selectedProductFilter);

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

        <AdminStats stats={data.stats} />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Cadastrar produto manual</h2>
            <p className="text-sm text-slate-500">Use links oficiais e preencha affiliate_url apenas com link afiliado valido.</p>
          </div>
          <ImportMercadoLivreForm />
          <ManualProductForm />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Regras de busca</h2>
            <p className="text-sm text-slate-500">Deixe regras Mercado Livre inativas enquanto a API de busca estiver bloqueada.</p>
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

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase">Produtos encontrados</h2>
            <p className="text-sm text-slate-500">Filtre por fonte, afiliado, destaque ou status antes de editar.</p>
          </div>
          <ProductFilterTabs selectedFilter={selectedProductFilter} products={data.products} />
          <ProductsTable
            products={filteredProducts}
            clickCountsByProduct={data.clickCountsByProduct}
            emptyMessage="Nenhum produto encontrado nesse filtro."
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
                {data.clickSummaries.map((item) => (
                  <li key={item.product_id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs font-bold uppercase text-slate-400">{item.source}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                      {item.clicks} cliques
                    </span>
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





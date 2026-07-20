import Link from "next/link";
import { redirect } from "next/navigation";
import MarketingGenerator from "@/components/admin/MarketingGenerator";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { normalizeSupabaseProduct, productColumns } from "@/lib/products";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getMarketingData() {
  const supabase = createServiceSupabaseClient();

  const [productsResult, clicksResult] = await Promise.all([
    supabase
      .from("products")
      .select(productColumns)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("clicks")
      .select("product_id")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  if (clicksResult.error) {
    throw new Error(clicksResult.error.message);
  }

  const clickCountsByProduct: Record<string, number> = {};

  for (const click of clicksResult.data || []) {
    const productId = String(click.product_id || "");

    if (productId) {
      clickCountsByProduct[productId] = (clickCountsByProduct[productId] || 0) + 1;
    }
  }

  return {
    products: (productsResult.data || []).map((product) => normalizeSupabaseProduct(product)),
    clickCountsByProduct,
  };
}

export default async function AdminMarketingPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const data = await getMarketingData();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-6 rounded-2xl bg-slate-950 p-6 text-white lg:flex-row lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="h-auto w-44 max-w-full rounded-xl border border-white/10 bg-white/5 p-3" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Divulgacao</p>
              <h1 className="text-3xl font-black uppercase md:text-4xl">Gerador rapido de posts</h1>
              <p className="mt-1 text-sm text-slate-300 md:text-base">Crie textos para WhatsApp, Instagram e TikTok usando os produtos do portal.</p>
            </div>
          </div>
          <Link href="/admin" className="rounded-xl border border-white/20 px-4 py-2 text-center text-xs font-black uppercase text-white hover:bg-white/10">
            Voltar ao admin
          </Link>
        </header>

        <MarketingGenerator
          products={data.products}
          clickCountsByProduct={data.clickCountsByProduct}
        />
      </section>
    </main>
  );
}
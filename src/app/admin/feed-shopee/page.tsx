import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNotice from "@/components/admin/AdminNotice";
import ShopeeFeedImporter from "@/components/admin/ShopeeFeedImporter";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getSingleParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

async function getShopeeFeedPageData() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("source, external_id, category")
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];

  return {
    categoryOptions: Array.from(new Set(rows.map((row) => String(row.category || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    existingShopeeExternalIds: rows
      .filter((row) => row.source === "shopee")
      .map((row) => String(row.external_id || ""))
      .filter(Boolean),
  };
}

export default async function AdminShopeeFeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};

  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const data = await getShopeeFeedPageData();
  const noticeError = getSingleParam(params, "notice_error");
  const noticeSuccess = getSingleParam(params, "notice_success");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-6 rounded-2xl bg-slate-950 p-6 text-white lg:flex-row lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img src="/img/vitrineSegura.png" alt="Vitrine Segura" className="h-auto w-44 max-w-full rounded-xl border border-white/10 bg-white/5 p-3" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Feed Shopee</p>
              <h1 className="text-3xl font-black uppercase md:text-4xl">Curadoria de feed</h1>
              <p className="mt-1 text-sm text-slate-300 md:text-base">Filtre o CSV gigante da Shopee e importe apenas produtos bons para a Vitrine Segura.</p>
            </div>
          </div>
          <Link href="/admin" className="rounded-xl border border-white/20 px-4 py-2 text-center text-xs font-black uppercase text-white hover:bg-white/10">
            Voltar ao admin
          </Link>
        </header>

        <AdminNotice key={noticeError || noticeSuccess || "feed-notice"} error={noticeError} success={noticeSuccess} />

        <ShopeeFeedImporter
          categoryOptions={data.categoryOptions}
          existingShopeeExternalIds={data.existingShopeeExternalIds}
        />
      </section>
    </main>
  );
}
"use client";

import { useMemo, useState } from "react";
import { importSelectedShopeeFeedProducts } from "@/app/admin/actions";

type FeedRow = Record<string, string>;

type FeedCandidate = {
  itemid: string;
  title: string;
  category: string;
  description: string;
  price: string;
  sale_price: string;
  discount_percentage: string;
  image_link: string;
  item_rating: string;
  product_link: string;
  affiliate_link: string;
  raw_category1: string;
  raw_category2: string;
  original_category: string;
  score: number;
  isDuplicate: boolean;
};

type ShopeeFeedImporterProps = {
  categoryOptions: string[];
  existingShopeeExternalIds: string[];
};

const defaultCategories = [
  "Casa e Decora\u00e7\u00e3o",
  "Vestu\u00e1rio e Acess\u00f3rios",
  "J\u00f3ias & Rel\u00f3gios",
  "Beleza",
  "Esportes e Fitness",
  "Celulares e Telefones",
  "Eletr\u00f4nicos, \u00c1udio e V\u00eddeo",
  "Eletrodom\u00e9sticos",
  "Ferramentas",
];

function parseNumber(value: string) {
  const cleaned = value.replace(/R\$/gi, "").replace(/%/g, "").replace(/\s/g, "").trim();

  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: string) {
  const parsed = parseNumber(value);
  return parsed === null ? "-" : parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell.trim());
      cell = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());

  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((cells) => {
    const object: FeedRow = {};

    headers.forEach((header, index) => {
      object[header] = cells[index] || "";
    });

    return object;
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapShopeeCategory(category1: string, category2: string) {
  const source = normalizeText(`${category1} ${category2}`);

  if (/home|living|kitchen|party|garden|furniture|decor/.test(source)) return "Casa e Decora\u00e7\u00e3o";
  if (/beauty|health|personal care|makeup|skincare/.test(source)) return "Beleza";
  if (/fashion|clothes|bags|shoes|apparel|women|men|baby|kids/.test(source)) return "Vestu\u00e1rio e Acess\u00f3rios";
  if (/jewel|watch|accessor/.test(source)) return "J\u00f3ias & Rel\u00f3gios";
  if (/sports|outdoor|fitness/.test(source)) return "Esportes e Fitness";
  if (/mobile|phone|tablet/.test(source)) return "Celulares e Telefones";
  if (/computer|camera|audio|video|gaming|electronic/.test(source)) return "Eletr\u00f4nicos, \u00c1udio e V\u00eddeo";
  if (/appliance/.test(source)) return "Eletrodom\u00e9sticos";
  if (/tool|improvement|hardware/.test(source)) return "Ferramentas";

  return "Casa e Decora\u00e7\u00e3o";
}

function rowToCandidate(row: FeedRow, existingIds: Set<string>, forcedCategory: string) {
  const itemid = row.itemid || row.item_id || row["item id"] || "";
  const title = row.title || "";
  const productLink = row.product_link || "";
  const affiliateLink = row["product_short link"] || row.product_short_link || row.offer_link || productLink;
  const salePrice = row.sale_price || row.price || "";
  const price = row.price || salePrice;
  const rating = row.item_rating || "";
  const discount = row.discount_percentage || "";
  const category = forcedCategory || mapShopeeCategory(row.global_category1 || "", row.global_category2 || "");
  const ratingValue = parseNumber(rating) || 0;
  const discountValue = parseNumber(discount) || 0;
  const salePriceValue = parseNumber(salePrice) || parseNumber(price) || 0;

  if (!itemid || !title || !productLink || !salePriceValue) {
    return null;
  }

  const score = ratingValue * 20 + discountValue + (salePriceValue <= 50 ? 20 : salePriceValue <= 100 ? 10 : 0);

  return {
    itemid,
    title,
    category,
    description: row.description || "",
    price,
    sale_price: salePrice,
    discount_percentage: discount,
    image_link: row.image_link || "",
    item_rating: rating,
    product_link: productLink,
    affiliate_link: affiliateLink,
    raw_category1: row.global_category1 || "",
    raw_category2: row.global_category2 || "",
    original_category: [row.global_category1 || "", row.global_category2 || ""].filter(Boolean).join(" / "),
    score,
    isDuplicate: existingIds.has(`shopee-${itemid}`),
  } satisfies FeedCandidate;
}

export default function ShopeeFeedImporter({ categoryOptions, existingShopeeExternalIds }: ShopeeFeedImporterProps) {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [feedRows, setFeedRows] = useState<FeedRow[]>([]);
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [minRating, setMinRating] = useState("4.7");
  const [maxPrice, setMaxPrice] = useState("100");
  const [minDiscount, setMinDiscount] = useState("10");
  const [maxResults, setMaxResults] = useState("100");
  const [query, setQuery] = useState("");
  const [originalCategoryFilter, setOriginalCategoryFilter] = useState("");
  const [forcedCategory, setForcedCategory] = useState("");
  const [sortMode, setSortMode] = useState("score");
  const [hideDuplicates, setHideDuplicates] = useState(true);

  const existingIds = useMemo(() => new Set(existingShopeeExternalIds), [existingShopeeExternalIds]);
  const categories = useMemo(() => Array.from(new Set([...defaultCategories, ...categoryOptions])).sort((a, b) => a.localeCompare(b, "pt-BR")), [categoryOptions]);
  const originalCategoryOptions = useMemo(() => Array.from(new Set(feedRows.map((row) => [row.global_category1 || "", row.global_category2 || ""].filter(Boolean).join(" / ")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [feedRows]);
  const selectedCandidates = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return candidates.filter((candidate) => selectedSet.has(candidate.itemid));
  }, [candidates, selectedIds]);

  function applyFilters(rows = feedRows) {
    if (rows.length === 0) {
      setStatus("Escolha um arquivo CSV antes de aplicar filtros.");
      return;
    }

    setStatus("Aplicando filtros...");
    setCandidates([]);
    setSelectedIds([]);

    const minRatingValue = parseNumber(minRating) ?? 0;
    const maxPriceValue = parseNumber(maxPrice) ?? Number.POSITIVE_INFINITY;
    const minDiscountValue = parseNumber(minDiscount) ?? 0;
    const maxResultsValue = Math.min(parseNumber(maxResults) ?? 100, 500);
    const normalizedQuery = normalizeText(query);
    const parsedCandidates: FeedCandidate[] = [];

    for (const row of rows) {
      const candidate = rowToCandidate(row, existingIds, forcedCategory);

      if (!candidate) continue;
      if (hideDuplicates && candidate.isDuplicate) continue;

      const salePrice = parseNumber(candidate.sale_price) ?? parseNumber(candidate.price) ?? 0;
      const rating = parseNumber(candidate.item_rating) ?? 0;
      const discount = parseNumber(candidate.discount_percentage) ?? 0;
      const searchable = normalizeText(`${candidate.title} ${candidate.description} ${candidate.raw_category1} ${candidate.raw_category2}`);
      const originalCategory = candidate.original_category;

      if (originalCategoryFilter && originalCategory !== originalCategoryFilter) continue;
      if (salePrice > maxPriceValue) continue;
      if (rating < minRatingValue) continue;
      if (discount < minDiscountValue) continue;
      if (normalizedQuery && !searchable.includes(normalizedQuery)) continue;

      parsedCandidates.push(candidate);
    }

    const nextCandidates = parsedCandidates
      .sort((a, b) => {
        if (sortMode === "discount") return (parseNumber(b.discount_percentage) || 0) - (parseNumber(a.discount_percentage) || 0);
        if (sortMode === "rating") return (parseNumber(b.item_rating) || 0) - (parseNumber(a.item_rating) || 0);
        if (sortMode === "price_asc") return (parseNumber(a.sale_price || a.price) || 0) - (parseNumber(b.sale_price || b.price) || 0);
        if (sortMode === "price_desc") return (parseNumber(b.sale_price || b.price) || 0) - (parseNumber(a.sale_price || a.price) || 0);

        return b.score - a.score;
      })
      .slice(0, maxResultsValue);

    setCandidates(nextCandidates);
    setSelectedIds(nextCandidates.slice(0, Math.min(50, nextCandidates.length)).map((candidate) => candidate.itemid));
    setStatus(`${rows.length.toLocaleString("pt-BR")} linhas analisadas. ${nextCandidates.length} candidato(s) exibido(s).`);
  }

  async function analyzeFile(file: File | null) {
    if (!file) return;

    setFileName(file.name);
    setStatus("Lendo arquivo...");
    setCandidates([]);
    setSelectedIds([]);

    const text = await file.text();
    setStatus("Analisando CSV...");

    const rows = parseCsv(text);
    setFeedRows(rows);
    applyFilters(rows);
  }
  function toggleCandidate(itemid: string) {
    setSelectedIds((currentIds) => currentIds.includes(itemid) ? currentIds.filter((id) => id !== itemid) : [...currentIds, itemid]);
  }

  function selectAll() {
    setSelectedIds(candidates.map((candidate) => candidate.itemid));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function updateCandidateCategory(itemid: string, category: string) {
    setCandidates((currentCandidates) =>
      currentCandidates.map((candidate) => candidate.itemid === itemid ? { ...candidate, category } : candidate),
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm md:p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Shopee</p>
        <h2 className="text-2xl font-black uppercase text-slate-950">Importar feed de produtos</h2>
        <p className="text-sm text-slate-500">Analise o CSV gigante no navegador, filtre bons candidatos e envie ao Supabase apenas os selecionados.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Arquivo CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => void analyzeFile(event.target.files?.[0] || null)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Aval. minima
          <input value={minRating} onChange={(event) => setMinRating(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Preco max.
          <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Desconto min.
          <input value={minDiscount} onChange={(event) => setMinDiscount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Max. exibidos
          <input value={maxResults} onChange={(event) => setMaxResults(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Buscar termo
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: martelo, cozinha, organizador" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Categoria original Shopee
          <select value={originalCategoryFilter} onChange={(event) => setOriginalCategoryFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            <option value="">Todas as categorias originais</option>
            {originalCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Categoria nossa padrao
          <select value={forcedCategory} onChange={(event) => setForcedCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            <option value="">Mapear automaticamente</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 lg:col-span-2">
          Ordenar por
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950">
            <option value="score">Melhor pontuacao</option>
            <option value="discount">Maior desconto</option>
            <option value="rating">Melhor avaliacao</option>
            <option value="price_asc">Menor preco</option>
            <option value="price_desc">Maior preco</option>
          </select>
        </label>
        <label className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 lg:col-span-2">
          <input type="checkbox" checked={hideDuplicates} onChange={(event) => setHideDuplicates(event.target.checked)} />
          Ignorar produtos ja importados
        </label>
        <button type="button" onClick={() => applyFilters()} disabled={feedRows.length === 0} className="rounded-xl bg-orange-500 px-4 py-3 text-xs font-black uppercase text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-2">
          Aplicar filtros
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-900">
        <div className="flex flex-wrap items-center gap-2">
          <span>{fileName || "Nenhum arquivo selecionado."}</span>
          <span>{status}</span>
        </div>
        <p className="text-xs font-semibold text-orange-800">
          Este feed nao trouxe coluna de comissao nem quantidade vendida. A curadoria usa preco, desconto, avaliacao, imagem, categoria original e link afiliado/curto quando disponivel.
        </p>
      </div>

      <form action={importSelectedShopeeFeedProducts} className="space-y-4">
        <input type="hidden" name="selected_products" value={JSON.stringify(selectedCandidates)} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-600">
            {selectedCandidates.length} selecionado(s) de {candidates.length} candidato(s)
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectAll} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase text-blue-700">Selecionar todos</button>
            <button type="button" onClick={clearSelection} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700">Limpar</button>
            <label className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase text-green-700">
              <input type="checkbox" name="publish_direct" />
              Publicar direto
            </label>
            <button disabled={selectedCandidates.length === 0} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40">
              Importar selecionados
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Escolha um CSV para analisar os candidatos do feed.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate) => {
              const selected = selectedIds.includes(candidate.itemid);

              return (
                <article key={candidate.itemid} className={`rounded-2xl border p-3 shadow-sm ${selected ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">
                      {candidate.image_link ? <img src={candidate.image_link} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] font-black uppercase text-slate-400">Sem img</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1 text-[10px] font-black uppercase">
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">Shopee</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{candidate.category}</span>
                        {candidate.isDuplicate ? <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Duplicado</span> : null}
                      </div>
                      <h3 className="mt-2 line-clamp-3 text-sm font-black leading-snug text-slate-950">{candidate.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">Original: {candidate.original_category || "Sem categoria"}</p>
                    </div>
                  </div>
                  <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Publicar em
                    <select value={candidate.category} onChange={(event) => updateCandidateCategory(candidate.itemid, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-950">
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className="rounded-full bg-white px-2 py-1 text-slate-950">{formatCurrency(candidate.sale_price || candidate.price)}</span>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">Nota {candidate.item_rating || "-"}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">-{candidate.discount_percentage || "0"}%</span>
                  </div>
                  <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700">
                    <input type="checkbox" checked={selected} onChange={() => toggleCandidate(candidate.itemid)} />
                    Importar este produto
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </form>
    </section>
  );
}
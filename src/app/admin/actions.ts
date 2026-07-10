"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  adminCookieName,
  getAdminSessionToken,
  isAdminAuthenticated,
  isValidAdminPassword,
} from "@/lib/admin/auth";
import { calculateProductScore } from "@/lib/adapters/normalization";
import { getMercadoLivreItemById, resolveMercadoLivreProductUrl } from "@/lib/mercadolivre/items";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ProductSource } from "@/types/product";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalInteger(value: FormDataEntryValue | null) {
  const parsed = optionalNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
}

function requiredNumber(formData: FormData, key: string) {
  const value = optionalNumber(formData.get(key));

  if (value === null) {
    throw new Error(`Missing required numeric field: ${key}`);
  }

  return value;
}

function redirectWithAdminMessage(key: "import_error" | "import_success" | "notice_error" | "notice_success", message: string): never {
  redirect(`/admin?${key}=${encodeURIComponent(message)}`);
}

function getMercadoLivreImportErrorMessage(error: unknown, itemId: string) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";

  if (message.includes(" 404 ") || message.includes('"status":404')) {
    return `Nao encontrei o item ${itemId} no Mercado Livre. Use o link do anuncio, normalmente com MLB-1234567890, e evite link de catalogo /p/ ou link curto.`;
  }

  if (message.includes(" 401 ") || message.includes(" 403 ")) {
    return `O Mercado Livre bloqueou a consulta automatica do item ${itemId} pela API, mesmo tentando modo publico, token e endpoint em lote. Cadastre esse produto manualmente no painel e use seu link afiliado no campo affiliate_url.`;
  }

  return `Nao consegui importar esse produto: ${message}`;
}

function normalizeSource(value: string): ProductSource {
  return value === "shopee" ? "shopee" : "mercadolivre";
}


function parseBulkNumber(value: string | undefined) {
  if (!value || value.trim() === "") {
    return null;
  }

  const normalized = value
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function splitBulkLine(line: string) {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }

  if (line.includes("|")) {
    return line.split("|").map((cell) => cell.trim());
  }

  return line.split(";").map((cell) => cell.trim());
}

function parseBulkProductLine(line: string, lineNumber: number) {
  const cells = splitBulkLine(line);
  const [sourceRaw, category, title, priceRaw, productUrl, affiliateUrl, imageUrl, oldPriceRaw, ratingRaw, soldCountRaw, sellerName] = cells;

  if (sourceRaw?.toLowerCase() === "source") {
    return null;
  }

  if (!sourceRaw || !category || !title || !priceRaw || !productUrl) {
    throw new Error(`Linha ${lineNumber}: preencha source, category, title, price e product_url.`);
  }

  const price = parseBulkNumber(priceRaw);

  if (price === null || price < 0) {
    throw new Error(`Linha ${lineNumber}: preco invalido.`);
  }

  const oldPrice = parseBulkNumber(oldPriceRaw);
  const rating = parseBulkNumber(ratingRaw);
  const soldCount = parseBulkNumber(soldCountRaw);
  const source = normalizeSource(sourceRaw.toLowerCase());
  const now = new Date().toISOString();

  return {
    source,
    external_id: `bulk-${source}-${hashText(productUrl)}`,
    title,
    description: null,
    category,
    price,
    old_price: oldPrice,
    currency: "BRL",
    image_url: imageUrl || null,
    product_url: productUrl,
    affiliate_url: affiliateUrl || null,
    rating,
    reviews_count: null,
    sold_count: soldCount === null ? null : Math.trunc(soldCount),
    seller_name: sellerName || null,
    seller_reputation: null,
    is_active: true,
    is_featured: false,
    score: calculateProductScore({
      price,
      rating,
      sold_count: soldCount === null ? null : Math.trunc(soldCount),
      seller_reputation: null,
    }),
    last_checked_at: now,
  };
}
function getProductPayload(formData: FormData, fallbackExternalId?: string) {
  const source = normalizeSource(requiredString(formData, "source"));
  const price = requiredNumber(formData, "price");
  const rating = optionalNumber(formData.get("rating"));
  const soldCount = optionalInteger(formData.get("sold_count"));
  const sellerReputation = optionalString(formData, "seller_reputation");

  return {
    source,
    external_id: optionalString(formData, "external_id") || fallbackExternalId || `manual-${Date.now()}`,
    title: requiredString(formData, "title"),
    description: optionalString(formData, "description"),
    category: requiredString(formData, "category"),
    price,
    old_price: optionalNumber(formData.get("old_price")),
    currency: optionalString(formData, "currency") || "BRL",
    image_url: optionalString(formData, "image_url"),
    product_url: requiredString(formData, "product_url"),
    affiliate_url: optionalString(formData, "affiliate_url"),
    rating,
    reviews_count: optionalInteger(formData.get("reviews_count")),
    sold_count: soldCount,
    seller_name: optionalString(formData, "seller_name"),
    seller_reputation: sellerReputation,
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    score: calculateProductScore({
      price,
      rating,
      sold_count: soldCount,
      seller_reputation: sellerReputation,
    }),
    last_checked_at: new Date().toISOString(),
  };
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

export async function loginAdmin(formData: FormData) {
  const password = requiredString(formData, "password");

  if (!isValidAdminPassword(password)) {
    redirect("/admin?error=invalid-password");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, getAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookieName);
  redirect("/admin");
}

export async function importMercadoLivreProduct(formData: FormData) {
  await requireAdmin();

  const productUrl = requiredString(formData, "product_url");
  const category = requiredString(formData, "category");
  const resolvedProduct = await resolveMercadoLivreProductUrl(productUrl);
  const itemId = resolvedProduct.itemId;

  if (!itemId) {
    redirectWithAdminMessage(
      "import_error",
      "Nao encontrei o ID do anuncio no link. Abra o produto no Mercado Livre e use o link completo que contenha MLB-1234567890.",
    );
  }

  let item: Awaited<ReturnType<typeof getMercadoLivreItemById>>;

  try {
    item = await getMercadoLivreItemById(itemId);
  } catch (error) {
    redirectWithAdminMessage("import_error", getMercadoLivreImportErrorMessage(error, itemId));
  }

  const rating = optionalNumber(formData.get("rating"));
  const soldCount = item.sold_count;
  const affiliateUrl = optionalString(formData, "affiliate_url");
  const price = item.price;
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("products").upsert(
    {
      ...item,
      category,
      product_url: resolvedProduct.url || item.product_url,
      affiliate_url: affiliateUrl,
      rating,
      reviews_count: optionalInteger(formData.get("reviews_count")),
      is_active: true,
      is_featured: formData.get("is_featured") === "on",
      score: calculateProductScore({
        price,
        rating,
        sold_count: soldCount,
        seller_reputation: item.seller_reputation,
      }),
      last_checked_at: new Date().toISOString(),
    },
    {
      onConflict: "source,external_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    redirectWithAdminMessage("import_error", `Nao consegui salvar no Supabase: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Produto cadastrado com sucesso.");
}

export async function importBulkProducts(formData: FormData) {
  await requireAdmin();

  const rawProducts = requiredString(formData, "bulk_products");
  const lines = rawProducts
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  if (lines.length > 200) {
    redirectWithAdminMessage("notice_error", "Importe no maximo 200 produtos por vez.");
  }

  const products = [];
  const errors: string[] = [];

  for (const [index, line] of lines.entries()) {
    try {
      const product = parseBulkProductLine(line, index + 1);

      if (product) {
        products.push(product);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Linha ${index + 1}: erro desconhecido.`);
    }
  }

  if (products.length === 0) {
    const message = errors.length > 0 ? errors.slice(0, 3).join(" ") : "Nenhum produto valido encontrado.";
    redirectWithAdminMessage("notice_error", message);
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("products").upsert(products, {
    onConflict: "source,external_id",
    ignoreDuplicates: false,
  });

  if (error) {
    redirectWithAdminMessage("notice_error", `Nao consegui importar em lote: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");

  const warning = errors.length > 0 ? ` ${errors.length} linha(s) ignorada(s): ${errors.slice(0, 2).join(" ")}` : "";
  redirectWithAdminMessage("notice_success", `${products.length} produto(s) importado(s) com sucesso.${warning}`);
}
export async function createManualProduct(formData: FormData) {
  await requireAdmin();

  const supabase = createServiceSupabaseClient();
  const payload = getProductPayload(formData);

  const { error } = await supabase.from("products").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Produto cadastrado com sucesso.");
}

export async function updateManualProduct(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const currentExternalId = requiredString(formData, "current_external_id");
  const supabase = createServiceSupabaseClient();
  const payload = getProductPayload(formData, currentExternalId);

  const { error } = await supabase.from("products").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Produto atualizado.");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const confirmDelete = formData.get("confirm_delete") === "on";

  if (!confirmDelete) {
    throw new Error("Confirme a exclusao do produto antes de apagar.");
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Produto excluido.");
}

export async function toggleProductActive(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const isActive = requiredString(formData, "is_active") === "true";
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("products").update({ is_active: !isActive }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleProductFeatured(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const isFeatured = requiredString(formData, "is_featured") === "true";
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({ is_featured: !isFeatured })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateAffiliateUrl(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const normalizedUrl = optionalString(formData, "affiliate_url");
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({ affiliate_url: normalizedUrl })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}


export async function markProductReviewed(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Produto marcado como revisado.");
}
export async function createSearchRule(formData: FormData) {
  await requireAdmin();

  const source = requiredString(formData, "source") as ProductSource;
  const category = requiredString(formData, "category");
  const query = requiredString(formData, "query");
  const maxResults = optionalNumber(formData.get("max_results")) ?? 20;
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("search_rules").insert({
    source,
    category,
    query,
    min_price: optionalNumber(formData.get("min_price")),
    max_price: optionalNumber(formData.get("max_price")),
    min_rating: optionalNumber(formData.get("min_rating")),
    max_results: maxResults,
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export async function updateSearchRule(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const source = requiredString(formData, "source") as ProductSource;
  const category = requiredString(formData, "category");
  const query = requiredString(formData, "query");
  const isActive = formData.get("is_active") === "on";
  const maxResults = optionalNumber(formData.get("max_results")) ?? 20;
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("search_rules")
    .update({
      source,
      category,
      query,
      min_price: optionalNumber(formData.get("min_price")),
      max_price: optionalNumber(formData.get("max_price")),
      min_rating: optionalNumber(formData.get("min_rating")),
      max_results: maxResults,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}


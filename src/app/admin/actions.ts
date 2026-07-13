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
import { searchProductsByRule } from "@/lib/adapters";
import { calculateProductScore } from "@/lib/adapters/normalization";
import { getMercadoLivreItemById, resolveMercadoLivreProductUrl } from "@/lib/mercadolivre/items";
import { saveSearchedProducts } from "@/lib/search-products";
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

function getSafeAdminReturnTo(formData: FormData, fallback = "/admin#produtos-encontrados") {
  const value = formData.get("return_to");

  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const returnTo = value.trim();

  if (!returnTo.startsWith("/admin")) {
    return fallback;
  }

  return returnTo;
}

function redirectWithAdminMessage(
  key: "import_error" | "import_success" | "notice_error" | "notice_success",
  message: string,
  returnTo = "/admin",
): never {
  const [pathAndQuery, hash] = returnTo.split("#");
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const target = `${pathAndQuery}${separator}${key}=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`;

  redirect(target);
}

function redirectWithFormMessage(
  formData: FormData,
  key: "import_error" | "import_success" | "notice_error" | "notice_success",
  message: string,
): never {
  redirectWithAdminMessage(key, message, getSafeAdminReturnTo(formData));
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
  if (value === "shopee") return "shopee";
  if (value === "shein") return "shein";
  return "mercadolivre";
}

const needsReviewDate = "2000-01-01T00:00:00.000Z";

async function checkUrlResponse(url: string | null) {
  if (!url) {
    return { ok: true, status: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "VitrineSeguraLinkCheck/1.0",
      },
    });

    if (headResponse.ok || (headResponse.status >= 300 && headResponse.status < 400)) {
      return { ok: true, status: headResponse.status };
    }

    if (headResponse.status !== 405 && headResponse.status !== 403) {
      return { ok: false, status: headResponse.status };
    }

    const getResponse = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "range": "bytes=0-0",
        "user-agent": "VitrineSeguraLinkCheck/1.0",
      },
    });

    return {
      ok: getResponse.ok || (getResponse.status >= 300 && getResponse.status < 400),
      status: getResponse.status,
    };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timeout);
  }
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
function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseShopeeSales(value: string | undefined) {
  if (!value || value.trim() === "") {
    return null;
  }

  const normalized = value.toLowerCase().replace("+", "").trim();

  if (normalized.includes("mil")) {
    const numberPart = normalized.replace("mil", "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(numberPart || "1");
    return Number.isFinite(parsed) ? Math.trunc(parsed * 1000) : null;
  }

  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function isShopeeCsvHeader(line: string) {
  const normalized = line.toLowerCase();
  return normalized.includes("item id") && normalized.includes("offer link") && normalized.includes("product link");
}
function isMercadoLivreCsvHeader(line: string) {
  const normalized = line.toLowerCase();
  return normalized.includes("title") && normalized.includes("product_url") && normalized.includes("price");
}

function parseMercadoLivreCsvProductLine(line: string, lineNumber: number) {
  const [title, category, priceRaw, productUrl, affiliateUrl, imageUrl, oldPriceRaw, ratingRaw, soldCountRaw, sellerName] = parseCsvLine(line);

  if (!title || !category || !priceRaw || !productUrl) {
    throw new Error(`Linha ${lineNumber}: CSV Mercado Livre sem title, category, price ou product_url.`);
  }

  const price = parseBulkNumber(priceRaw);

  if (price === null || price < 0) {
    throw new Error(`Linha ${lineNumber}: preco invalido no CSV Mercado Livre.`);
  }

  const oldPrice = parseBulkNumber(oldPriceRaw);
  const rating = parseBulkNumber(ratingRaw);
  const soldCount = parseBulkNumber(soldCountRaw);
  const now = new Date().toISOString();

  return {
    source: "mercadolivre" as ProductSource,
    external_id: `ml-${hashText(productUrl)}`,
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

function parseShopeeCsvProductLine(line: string, lineNumber: number, category: string) {
  const [itemId, itemName, priceRaw, salesRaw, storeName, , , productLink, offerLink] = parseCsvLine(line);

  if (!itemId || !itemName || !priceRaw || !productLink) {
    throw new Error(`Linha ${lineNumber}: CSV Shopee sem item, nome, preco ou link do produto.`);
  }

  const price = parseBulkNumber(priceRaw);

  if (price === null || price < 0) {
    throw new Error(`Linha ${lineNumber}: preco invalido no CSV Shopee.`);
  }

  const soldCount = parseShopeeSales(salesRaw);
  const now = new Date().toISOString();

  return {
    source: "shopee" as ProductSource,
    external_id: `shopee-${itemId}`,
    title: itemName,
    description: null,
    category,
    price,
    old_price: null,
    currency: "BRL",
    image_url: null,
    product_url: productLink,
    affiliate_url: offerLink || null,
    rating: null,
    reviews_count: null,
    sold_count: soldCount,
    seller_name: storeName || null,
    seller_reputation: null,
    is_active: true,
    is_featured: false,
    score: calculateProductScore({
      price,
      rating: null,
      sold_count: soldCount,
      seller_reputation: null,
    }),
    last_checked_at: now,
  };
}

function parseSheinSoldCount(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(mil)?\+?\s*vendido/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(".", "").replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed * (match[2] ? 1000 : 1));
}

function parseSheinOfferText(rawText: string, category: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const products = [];

  for (let index = 0; index < lines.length; index += 1) {
    const urlMatch = lines[index].match(/https?:\/\/onelink\.shein\.com\/\S+/i);

    if (!urlMatch) {
      continue;
    }

    const affiliateUrl = urlMatch[0];
    const nearbyLines = lines.slice(Math.max(0, index - 8), index + 1);
    const priceLineIndex = nearbyLines.findLastIndex((line) => /pre(?:c|\u00e7)o\s*\[/i.test(line));

    if (priceLineIndex === -1) {
      continue;
    }

    const priceLine = nearbyLines[priceLineIndex];
    const titleLine = nearbyLines.slice(priceLineIndex + 1).find((line) =>
      !/^https?:\/\//i.test(line) &&
      !/cupom|oferta|promo(?:c|\u00e7)(?:a|\u00e3)o|novo usu(?:a|\u00e1)rio/i.test(line) &&
      !/pre(?:c|\u00e7)o\s*\[/i.test(line),
    );
    const detailsLine = titleLine ? `${priceLine} ${titleLine}` : priceLine;
    const priceMatch = priceLine.match(/pre(?:c|\u00e7)o\s*\[\s*R\$\s*([^\]]+)\]/i);
    const price = parseBulkNumber(priceMatch?.[1]);

    if (price === null || price < 0) {
      continue;
    }

    const title = detailsLine
      .replace(/^.*?pre(?:c|\u00e7)o\s*\[[^\]]+\]/i, "")
      .replace(/^\s*-?\d+%\s*/i, "")
      .replace(/\s+\d+(?:[.,]\d+)?\+?\s*(?:mil\s+)?vendido.*$/i, "")
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();

    if (!title) {
      continue;
    }

    const soldCount = parseSheinSoldCount(detailsLine);
    const now = new Date().toISOString();

    products.push({
      source: "shein" as ProductSource,
      external_id: `shein-${hashText(affiliateUrl)}`,
      title,
      description: null,
      category,
      price,
      old_price: null,
      currency: "BRL",
      image_url: null,
      product_url: affiliateUrl,
      affiliate_url: affiliateUrl,
      rating: null,
      reviews_count: null,
      sold_count: soldCount,
      seller_name: "Shein",
      seller_reputation: null,
      is_active: true,
      is_featured: false,
      score: calculateProductScore({
        price,
        rating: null,
        sold_count: soldCount,
        seller_reputation: null,
      }),
      last_checked_at: now,
    });
  }

  return products;
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
function getCampaignPayload(formData: FormData) {
  return {
    source: normalizeSource(requiredString(formData, "source")),
    title: requiredString(formData, "title"),
    description: optionalString(formData, "description"),
    coupon_code: optionalString(formData, "coupon_code"),
    campaign_url: requiredString(formData, "campaign_url"),
    image_url: optionalString(formData, "image_url"),
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
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

  const file = formData.get("bulk_file");
  const fileText = file instanceof File && file.size > 0 ? await file.text() : null;
  const rawProducts = fileText || optionalString(formData, "bulk_products") || "";
  const defaultCategory = optionalString(formData, "bulk_category") || "Shopee";
  const lines = rawProducts
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  if (lines.length > 200) {
    redirectWithAdminMessage("notice_error", "Importe no maximo 200 produtos por vez.");
  }

  const sheinTextProducts = rawProducts.includes("onelink.shein.com") ? parseSheinOfferText(rawProducts, defaultCategory) : [];
  const products: Array<Record<string, unknown>> = [...sheinTextProducts];
  const errors: string[] = [];

  const isSheinOfferText = sheinTextProducts.length > 0;
  const isShopeeCsv = !isSheinOfferText && lines.some((line) => isShopeeCsvHeader(line));
  const isMercadoLivreCsv = !isSheinOfferText && lines.some((line) => isMercadoLivreCsvHeader(line));

  for (const [index, line] of lines.entries()) {
    try {
      if (isSheinOfferText || isShopeeCsvHeader(line) || isMercadoLivreCsvHeader(line)) {
        continue;
      }

      const product = isShopeeCsv
        ? parseShopeeCsvProductLine(line, index + 1, defaultCategory)
        : isMercadoLivreCsv
          ? parseMercadoLivreCsvProductLine(line, index + 1)
          : parseBulkProductLine(line, index + 1);

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

  const uniqueProductsByKey = new Map<string, Record<string, unknown>>();
  let duplicateCount = 0;

  for (const product of products) {
    const key = `${String(product.source)}:${String(product.external_id)}`;

    if (uniqueProductsByKey.has(key)) {
      duplicateCount += 1;
    }

    uniqueProductsByKey.set(key, product);
  }

  const productsToSave = Array.from(uniqueProductsByKey.values());
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("products").upsert(productsToSave, {
    onConflict: "source,external_id",
    ignoreDuplicates: false,
  });

  if (error) {
    redirectWithAdminMessage("notice_error", `Nao consegui importar em lote: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");

  const warningParts = [];

  if (duplicateCount > 0) {
    warningParts.push(`${duplicateCount} duplicado(s) ignorado(s)`);
  }

  if (errors.length > 0) {
    warningParts.push(`${errors.length} linha(s) ignorada(s): ${errors.slice(0, 2).join(" ")}`);
  }

  const warning = warningParts.length > 0 ? ` ${warningParts.join(". ")}` : "";
  redirectWithAdminMessage("notice_success", `${productsToSave.length} produto(s) importado(s) com sucesso.${warning}`);
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
  redirectWithFormMessage(formData, "notice_success", "Produto atualizado.");
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
  redirectWithFormMessage(formData, "notice_success", "Produto excluido.");
}

async function updateProductCategoriesFromForm(formData: FormData, ids: string[]) {
  const supabase = createServiceSupabaseClient();
  const updates = ids
    .map((id) => ({ id, category: formData.get(`category_${id}`) }))
    .filter((item): item is { id: string; category: string } => typeof item.category === "string" && item.category.trim().length > 0)
    .map((item) => supabase.from("products").update({ category: item.category.trim() }).eq("id", item.id));

  const results = await Promise.all(updates);
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    throw new Error(firstError.message);
  }
}

export async function updatePendingProductCategories(formData: FormData) {
  await requireAdmin();

  const ids = formData
    .getAll("pending_product_id")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (ids.length === 0) {
    redirectWithFormMessage(formData, "notice_error", "Nenhum produto pendente para atualizar.");
  }

  await updateProductCategoriesFromForm(formData, ids);

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithFormMessage(formData, "notice_success", "Categorias atualizadas.");
}
export async function deleteSelectedPendingProducts(formData: FormData) {
  await requireAdmin();

  const ids = formData
    .getAll("product_id")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (ids.length === 0) {
    redirectWithFormMessage(formData, "notice_error", "Selecione ao menos um produto pendente para excluir.");
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .delete()
    .in("id", ids)
    .eq("is_active", false)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithFormMessage(formData, "notice_success", `${data?.length || 0} produto(s) pendente(s) excluido(s).`);
}
export async function publishSelectedProducts(formData: FormData) {
  await requireAdmin();

  const ids = formData
    .getAll("product_id")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (ids.length === 0) {
    redirectWithFormMessage(formData, "notice_error", "Selecione ao menos um produto para publicar.");
  }

  const supabase = createServiceSupabaseClient();
  await updateProductCategoriesFromForm(formData, ids);
  const { error } = await supabase.from("products").update({ is_active: true }).in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithFormMessage(formData, "notice_success", `${ids.length} produto(s) publicado(s).`);
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
  redirectWithFormMessage(formData, "notice_success", isActive ? "Produto desativado." : "Produto ativado.");
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
  redirectWithFormMessage(formData, "notice_success", isFeatured ? "Destaque removido." : "Produto destacado.");
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
  redirectWithFormMessage(formData, "notice_success", "Link afiliado atualizado.");
}


export async function checkProductLinks(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const supabase = createServiceSupabaseClient();
  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, title, product_url, affiliate_url")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !product) {
    redirectWithFormMessage(formData, "notice_error", loadError?.message || "Produto nao encontrado para verificar links.");
  }

  const productUrl = typeof product.product_url === "string" ? product.product_url : null;
  const affiliateUrl = typeof product.affiliate_url === "string" ? product.affiliate_url : null;
  const [productCheck, affiliateCheck] = await Promise.all([
    checkUrlResponse(productUrl),
    checkUrlResponse(affiliateUrl),
  ]);
  const hasFailure = !productCheck.ok || !affiliateCheck.ok;

  const { error: updateError } = await supabase
    .from("products")
    .update({ last_checked_at: hasFailure ? needsReviewDate : new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    redirectWithFormMessage(formData, "notice_error", `Nao consegui marcar a revisao do produto: ${updateError.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");

  if (hasFailure) {
    const failures = [
      productCheck.ok ? null : `original ${productCheck.status ? `HTTP ${productCheck.status}` : "sem resposta"}`,
      affiliateCheck.ok ? null : `afiliado ${affiliateCheck.status ? `HTTP ${affiliateCheck.status}` : "sem resposta"}`,
    ].filter(Boolean);

    redirectWithFormMessage(formData, "notice_error", `Link com falha (${failures.join(", ")}). Produto marcado para revisao.`);
  }

  redirectWithFormMessage(formData, "notice_success", "Links verificados com sucesso. Produto revisado.");
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
  redirectWithFormMessage(formData, "notice_success", "Produto marcado como revisado.");
}
export async function searchProductsFromRule(formData: FormData) {
  await requireAdmin();

  const source = normalizeSource(requiredString(formData, "source"));
  const category = requiredString(formData, "category");
  const query = requiredString(formData, "query");
  const maxResults = optionalNumber(formData.get("max_results")) ?? 20;
  let saved = 0;

  try {
    const products = await searchProductsByRule({
      source,
      category,
      query,
      min_price: optionalNumber(formData.get("min_price")),
      max_price: optionalNumber(formData.get("max_price")),
      min_rating: optionalNumber(formData.get("min_rating")),
      max_results: maxResults,
    });
    saved = await saveSearchedProducts(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    redirectWithAdminMessage("notice_error", `Nao consegui buscar produtos: ${message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage(
    "notice_success",
    `${saved} produto(s) encontrado(s). Revise a fila Aguardando publicacao.`,
  );
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

export async function deleteSearchRule(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("search_rules").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  redirectWithAdminMessage("notice_success", "Regra excluida.");
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


export async function createCampaign(formData: FormData) {
  await requireAdmin();

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("campaigns").insert(getCampaignPayload(formData));

  if (error) {
    redirectWithAdminMessage("notice_error", `Nao consegui cadastrar campanha: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Campanha cadastrada com sucesso.", "/admin#campanhas");
}

export async function updateCampaign(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("campaigns").update(getCampaignPayload(formData)).eq("id", id);

  if (error) {
    redirectWithAdminMessage("notice_error", `Nao consegui atualizar campanha: ${error.message}`, "/admin#campanhas");
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Campanha atualizada.", "/admin#campanhas");
}

export async function deleteCampaign(formData: FormData) {
  await requireAdmin();

  const id = requiredString(formData, "id");
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);

  if (error) {
    redirectWithAdminMessage("notice_error", `Nao consegui excluir campanha: ${error.message}`, "/admin#campanhas");
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirectWithAdminMessage("notice_success", "Campanha excluida.", "/admin#campanhas");
}

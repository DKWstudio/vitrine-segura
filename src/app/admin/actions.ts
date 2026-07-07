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
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ProductSource } from "@/types/product";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
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
  const affiliateUrl = formData.get("affiliate_url");
  const normalizedUrl = typeof affiliateUrl === "string" && affiliateUrl.trim() !== "" ? affiliateUrl.trim() : null;
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

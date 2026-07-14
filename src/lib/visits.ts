import { createServiceSupabaseClient } from "@/lib/supabase/server";

const MAX_PATH_LENGTH = 300;
const MAX_TEXT_LENGTH = 500;

function limitText(value: string | null | undefined, maxLength = MAX_TEXT_LENGTH) {
  if (!value) {
    return null;
  }

  return value.slice(0, maxLength);
}

export async function getSiteVisitCount() {
  try {
    const supabase = createServiceSupabaseClient();
    const { count, error } = await supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.warn("Could not load site visit count.", error.message);
      return null;
    }

    return count ?? 0;
  } catch (error) {
    console.warn("Could not create Supabase client for site visits.", error);
    return null;
  }
}

export async function registerSiteVisit(input: {
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}) {
  try {
    const supabase = createServiceSupabaseClient();
    const path = input.path?.startsWith("/") ? input.path.slice(0, MAX_PATH_LENGTH) : "/";

    const { error } = await supabase.from("site_visits").insert({
      path,
      referrer: limitText(input.referrer),
      user_agent: limitText(input.userAgent),
    });

    if (error) {
      console.warn("Could not register site visit.", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Could not create Supabase client to register site visit.", error);
    return false;
  }
}
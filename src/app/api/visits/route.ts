import { NextResponse } from "next/server";
import { registerSiteVisit } from "@/lib/visits";

export async function POST(request: Request) {
  let path = "/";
  let referrer: string | null = null;

  try {
    const body = await request.json();
    path = typeof body?.path === "string" ? body.path : "/";
    referrer = typeof body?.referrer === "string" ? body.referrer : null;
  } catch {
    path = "/";
  }

  const ok = await registerSiteVisit({
    path,
    referrer,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok });
}
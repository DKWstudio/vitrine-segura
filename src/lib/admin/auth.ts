import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const adminCookieName = "vs_admin_session";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSessionSecret() {
  return process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function getAdminSessionToken() {
  const password = getAdminPassword();
  const secret = getSessionSecret();

  if (!password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`v1:${password}`).digest("hex");
}

export function isValidAdminPassword(password: string) {
  const expected = getAdminPassword();

  if (!expected || !password) {
    return false;
  }

  const actualBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName)?.value;
  const expectedToken = getAdminSessionToken();

  if (!token || !expectedToken) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

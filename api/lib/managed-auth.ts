import { decodeJwt } from "jose";
import { parse } from "cookie";
import { Session } from "@contracts/constants";

export type ManagedIdentity = { id: string; phone?: string; phone_confirmed_at?: string; aal?: string };
export function authConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !url.startsWith("https://")) return null;
  // This endpoint exposes only publishable keys; reject service-role secrets.
  if (!key.startsWith("sb_publishable_")) {
    try { if (decodeJwt(key).role !== "anon") return null; } catch { return null; }
  }
  return { url, key };
}
export function normalizePhone(value: string) {
  let phone = value.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (/^0\d{9}$/.test(phone)) phone = "256" + phone.slice(1);
  if (!/^\d{10,15}$/.test(phone)) throw new Error("Invalid phone number");
  return phone;
}
export function ownsPhone(identity: ManagedIdentity | undefined, phone: string) {
  if (!identity?.phone || !identity.phone_confirmed_at) return false;
  try { return normalizePhone(identity.phone) === normalizePhone(phone); } catch { return false; }
}
export function isLender(identity: ManagedIdentity | undefined) {
  const ids = (process.env.LENDER_SUPABASE_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  return !!identity && identity.aal === "aal2" && ids.includes(identity.id);
}
export async function verifyManagedToken(token: string): Promise<ManagedIdentity | undefined> {
  const config = authConfig();
  if (!config || !token || token.length > 8192) return undefined;
  try {
    // Validate this exact token at the configured Auth server before reading claims.
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return undefined;
    const user = await response.json() as ManagedIdentity;
    const claims = decodeJwt(token);
    if (!user.id || claims.sub !== user.id || claims.iss !== `${config.url}/auth/v1` || claims.aud !== "authenticated" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return undefined;
    return { id: user.id, phone: user.phone, phone_confirmed_at: user.phone_confirmed_at, aal: claims.aal as string };
  } catch { return undefined; }
}
export async function authenticateManagedRequest(headers: Headers) {
  const bearer = headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : parse(headers.get("cookie") ?? "")[Session.cookieName];
  return verifyManagedToken(token ?? "");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL ?? new URL(request.url).origin;
  try { return origin === new URL(expected).origin; } catch { return false; }
}

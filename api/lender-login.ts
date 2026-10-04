import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import { upsertUser } from "./queries/users";
import { verifyManagedToken, isLender, sameOrigin } from "./lib/managed-auth";

export async function lenderLoginHandler(c: Context) {
  if (!sameOrigin(c.req.raw)) return c.json({ error: "Same-origin sign-in required" }, 403);
  let token: unknown;
  try { token = (await c.req.json()).accessToken; } catch { return c.json({ error: "Bad request" }, 400); }
  if (typeof token !== "string") return c.json({ error: "Verified account and MFA required; PIN sign-in is disabled" }, 401);
  const identity = await verifyManagedToken(token);
  if (!isLender(identity)) return c.json({ error: "Authorised lender account with MFA required" }, 403);
  await upsertUser({ unionId: `supabase:${identity!.id}`, name: "Lender", role: "admin", lastSignInAt: new Date() });
  setCookie(c, Session.cookieName, token, { ...getSessionCookieOptions(c.req.raw.headers), maxAge: Session.maxAgeMs / 1000 });
  return c.json({ ok: true });
}

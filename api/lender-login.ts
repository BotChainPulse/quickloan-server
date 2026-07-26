import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import { signSessionToken } from "./kimi/session";
import { upsertUser } from "./queries/users";

// Simple owner-only login for the lender dashboard.
// The Kimi OAuth app is bound to a dead preview domain, so the dashboard
// uses a private PIN (LENDER_PIN env var) instead. Only the lender needs
// access; borrower endpoints stay public via phone-keyed queries.
export async function lenderLoginHandler(c: Context) {
  let pin = "";
  try {
    const body = await c.req.json();
    pin = String(body?.pin ?? "");
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }

  const expected = process.env.LENDER_PIN ?? "";
  if (!expected) {
    return c.json({ error: "LENDER_PIN not configured on server" }, 500);
  }
  if (!pin || pin !== expected) {
    return c.json({ error: "Wrong PIN" }, 401);
  }

  await upsertUser({
    unionId: env.ownerUnionId || "lender",
    name: "Lender",
    lastSignInAt: new Date(),
  });

  const token = await signSessionToken({
    unionId: env.ownerUnionId || "lender",
    clientId: env.appId,
  });

  const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
  setCookie(c, Session.cookieName, token, {
    ...cookieOpts,
    maxAge: Session.maxAgeMs / 1000,
  });

  return c.json({ ok: true });
}

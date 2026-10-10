import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { parse } from "cookie";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { borrowerAccounts, borrowerSessions } from "@db/schema";
import { getDb } from "./queries/connection";
import {
  allowAttempt,
  digest,
  isSameOrigin,
  normalizePhone,
  opaqueToken,
  passwordHash,
  passwordMatches,
} from "./borrower-security";

const cookieName = "ql_borrower";
const credentials = z.object({
  phone: z.string().max(24),
  password: z.string().min(10).max(128),
});
export async function getBorrower(request: Request) {
  const raw = parse(request.headers.get("cookie") ?? "")[cookieName];
  if (!raw || raw.length > 100) return undefined;
  const rows = await getDb()
    .select({
      id: borrowerAccounts.id,
      phone: borrowerAccounts.phone,
      verified: borrowerAccounts.phoneVerified,
      tokenHash: borrowerSessions.tokenHash,
    })
    .from(borrowerSessions)
    .innerJoin(
      borrowerAccounts,
      eq(borrowerSessions.borrowerId, borrowerAccounts.id)
    )
    .where(
      and(
        eq(borrowerSessions.tokenHash, digest(raw)),
        gt(borrowerSessions.expiresAt, new Date())
      )
    )
    .limit(1);
  return rows[0];
}
async function session(c: Context, borrowerId: number) {
  const token = opaqueToken();
  await getDb()
    .insert(borrowerSessions)
    .values({
      tokenHash: digest(token),
      borrowerId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  setCookie(c, cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function borrowerAuthHandler(c: Context, register: boolean) {
  if (!isSameOrigin(c.req.raw))
    return c.json(
      { error: "Open Quick Loan in the same browser tab and try again" },
      403
    );
  const ip = c.req.header("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!allowAttempt(`borrower-ip:${ip}`, 20))
    return c.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      429
    );
  const parsed = credentials.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json(
      {
        error: "Use a Uganda mobile number and a password of 10–128 characters",
      },
      400
    );
  let phone: string;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch {
    return c.json({ error: "Enter a valid Uganda mobile number" }, 400);
  }
  if (!allowAttempt(`borrower-phone:${phone}`))
    return c.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      429
    );
  const db = getDb();
  const accounts = await db
    .select()
    .from(borrowerAccounts)
    .where(eq(borrowerAccounts.phone, phone))
    .limit(1);
  const account = accounts[0];
  if (register) {
    if (account)
      return c.json(
        {
          error:
            "Unable to create this account. If you already registered, sign in.",
        },
        409
      );
    try {
      await db.insert(borrowerAccounts).values({
        phone,
        passwordHash: await passwordHash(parsed.data.password),
      });
    } catch {
      return c.json(
        { error: "Unable to create this account. Please try signing in." },
        409
      );
    }
    const [created] = await db
      .select({ id: borrowerAccounts.id })
      .from(borrowerAccounts)
      .where(eq(borrowerAccounts.phone, phone))
      .limit(1);
    await session(c, created.id);
  } else {
    // Do the expensive hash work even when the account does not exist.
    const stored =
      account?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(64)}`;
    if (!(await passwordMatches(parsed.data.password, stored)) || !account)
      return c.json({ error: "Mobile number or password is incorrect" }, 401);
    await session(c, account.id);
  }
  return c.json({ ok: true });
}
export async function borrowerLogout(c: Context) {
  if (!isSameOrigin(c.req.raw)) return c.json({ error: "Forbidden" }, 403);
  const token = getCookie(c, cookieName);
  if (token)
    await getDb()
      .delete(borrowerSessions)
      .where(eq(borrowerSessions.tokenHash, digest(token)));
  deleteCookie(c, cookieName, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  return c.json({ ok: true });
}

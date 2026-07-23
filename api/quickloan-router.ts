import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { applications, notifications } from "@db/schema";
import { desc, eq, and, isNull } from "drizzle-orm";

const photoSchema = z.string().max(400_000).nullable().optional();

export const quickloanRouter = createRouter({
  // ── Borrower endpoints (public, keyed by phone) ──────────────────
  submit: publicQuery
    .input(
      z.object({
        name: z.string().min(3).max(255),
        phone: z.string().min(9).max(20),
        dob: z.string().max(20).optional(),
        nin: z.string().max(20).optional(),
        gender: z.string().max(10).optional(),
        district: z.string().max(100).optional(),
        occupation: z.string().max(50).optional(),
        income: z.string().max(50).optional(),
        amount: z.number().int().min(20000).max(300000),
        durationWeeks: z.number().int().min(1).max(52),
        purpose: z.string().max(50).optional(),
        kinName: z.string().max(255).optional(),
        kinPhone: z.string().max(20).optional(),
        signature: z.string().max(255).optional(),
        idFrontPhoto: photoSchema,
        idBackPhoto: photoSchema,
        livenessPhoto: photoSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const ref = "QL-" + Math.floor(100000 + Math.random() * 900000);
      await db.insert(applications).values({ ...input, ref });
      await db.insert(notifications).values({
        phone: input.phone,
        title: `Application received — ${ref}`,
        body: `${input.name}, your loan application for UGX ${input.amount.toLocaleString()} was received and is now PENDING REVIEW. You will be notified when it is decided.`,
      });
      return { ref, status: "pending" as const };
    }),

  myApplications: publicQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(({ input }) =>
      getDb()
        .select({
          ref: applications.ref,
          amount: applications.amount,
          durationWeeks: applications.durationWeeks,
          purpose: applications.purpose,
          status: applications.status,
          decisionNote: applications.decisionNote,
          createdAt: applications.createdAt,
          decidedAt: applications.decidedAt,
        })
        .from(applications)
        .where(eq(applications.phone, input.phone))
        .orderBy(desc(applications.createdAt)),
    ),

  myNotifications: publicQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(({ input }) =>
      getDb()
        .select()
        .from(notifications)
        .where(eq(notifications.phone, input.phone))
        .orderBy(desc(notifications.createdAt)),
    ),

  unreadCount: publicQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.phone, input.phone), isNull(notifications.readAt)));
      return { count: rows.length };
    }),

  markRead: publicQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .mutation(({ input }) =>
      getDb()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.phone, input.phone), isNull(notifications.readAt))),
    ),

  // ── Lender endpoints (admin only) ────────────────────────────────
  listApplications: adminQuery
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
    .query(({ input }) => {
      const db = getDb();
      const base = db
        .select({
          id: applications.id,
          ref: applications.ref,
          name: applications.name,
          phone: applications.phone,
          district: applications.district,
          amount: applications.amount,
          durationWeeks: applications.durationWeeks,
          purpose: applications.purpose,
          status: applications.status,
          createdAt: applications.createdAt,
        })
        .from(applications)
        .orderBy(desc(applications.createdAt));
      return input?.status ? base.where(eq(applications.status, input.status)) : base;
    }),

  applicationDetail: adminQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) =>
      getDb().query.applications.findFirst({ where: eq(applications.id, input.id) }),
    ),

  decide: adminQuery
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const app = await db.query.applications.findFirst({
        where: eq(applications.id, input.id),
      });
      if (!app) throw new Error("Application not found");
      const status = input.approved ? "approved" : "rejected";
      await db
        .update(applications)
        .set({ status, decisionNote: input.note ?? null, decidedAt: new Date() })
        .where(eq(applications.id, input.id));
      await db.insert(notifications).values({
        phone: app.phone,
        title: input.approved
          ? `🎉 Loan APPROVED — ${app.ref}`
          : `Loan application update — ${app.ref}`,
        body: input.approved
          ? `${app.name}, good news! Your loan of UGX ${app.amount.toLocaleString()} has been APPROVED. ${input.note ?? "You will receive the money on your mobile money number shortly."}`
          : `${app.name}, unfortunately your loan application of UGX ${app.amount.toLocaleString()} was not approved this time. ${input.note ?? "You may apply again after 30 days."}`,
      });
      return { ok: true, status };
    }),

  stats: adminQuery.query(async () => {
    const db = getDb();
    const all = await db.select({ status: applications.status, amount: applications.amount }).from(applications);
    return {
      total: all.length,
      pending: all.filter((a) => a.status === "pending").length,
      approved: all.filter((a) => a.status === "approved").length,
      rejected: all.filter((a) => a.status === "rejected").length,
      approvedVolume: all.filter((a) => a.status === "approved").reduce((s, a) => s + a.amount, 0),
    };
  }),
});

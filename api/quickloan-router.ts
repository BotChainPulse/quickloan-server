import { z } from "zod";
import { createRouter, borrowerQuery, adminQuery, requireOwnedPhone } from "./middleware";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { applications, notifications } from "@db/schema";
import { desc, eq, and, isNull } from "drizzle-orm";
import { nextOfKinFields, validateNextOfKin } from "@contracts/next-of-kin";

const photoSchema = z.string().max(400_000).nullable().optional();

export const quickloanRouter = createRouter({
  // Existing borrower records require verified phone ownership. New lending is closed.
  submit: borrowerQuery
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
        ...nextOfKinFields,
        signature: z.string().max(255).optional(),
        idFrontPhoto: photoSchema,
        idBackPhoto: photoSchema,
        livenessPhoto: photoSchema,
      }).superRefine(validateNextOfKin),
    )
    .mutation(({ input, ctx }) => {
      requireOwnedPhone(ctx, input.phone);
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "QuickLoan is in preparation. New applications are closed until lending safeguards and payments are verified." });
    }),

  myApplications: borrowerQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(({ input, ctx }) => {
      requireOwnedPhone(ctx, input.phone);
      return getDb()
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
        .orderBy(desc(applications.createdAt));
    }),

  myNotifications: borrowerQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(({ input, ctx }) => {
      requireOwnedPhone(ctx, input.phone);
      return getDb()
        .select()
        .from(notifications)
        .where(eq(notifications.phone, input.phone))
        .orderBy(desc(notifications.createdAt));
    }),

  unreadCount: borrowerQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .query(async ({ input, ctx }) => {
      requireOwnedPhone(ctx, input.phone);
      const rows = await getDb()
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.phone, input.phone), isNull(notifications.readAt)));
      return { count: rows.length };
    }),

  markRead: borrowerQuery
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .mutation(({ input, ctx }) => {
      requireOwnedPhone(ctx, input.phone);
      return getDb()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.phone, input.phone), isNull(notifications.readAt)));
    }),

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
        id: z.number().int().positive(),
        approved: z.boolean(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      return db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, input.id),
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (app.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Application already decided" });
      const status = input.approved ? "approved" : "rejected";
      const [result] = await tx
        .update(applications)
        .set({ status, decisionNote: input.note ?? null, decidedAt: new Date() })
        .where(and(eq(applications.id, input.id), eq(applications.status, "pending")));
      if (result.affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "Application already decided" });
      await tx.insert(notifications).values({
        phone: app.phone,
        title: input.approved
          ? `Application review approved — ${app.ref}`
          : `Loan application update — ${app.ref}`,
        body: input.approved
          ? `Your application ${app.ref} passed this review step. This is not a loan agreement or confirmation that money has been sent. QuickLoan remains in pilot preparation; no disbursement is enabled.`
          : `Your application ${app.ref} was not approved in this review. No money has been sent. Further applications are not open during pilot preparation.`,
      });
      return { ok: true, status };
      });
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

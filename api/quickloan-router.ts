import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { createRouter, borrowerQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { applications, notifications, borrowerRequests } from "@db/schema";
import { desc, eq, and, isNull } from "drizzle-orm";
import { seal, unseal, allowAttempt } from "./borrower-security";
import {
  applicationInput,
  affordability,
  type ApplicationInput,
} from "@contracts/loan-policy";
import { env } from "./lib/env";

export const quickloanRouter = createRouter({
  submit: borrowerQuery
    .input(applicationInput)
    .mutation(async ({ input, ctx }) => {
      if (
        [input.kinPhone, input.kin2Phone, input.kin3Phone].includes(
          ctx.borrower.phone
        )
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "References must be different from your own mobile number",
        });
      if (!allowAttempt(`application:${ctx.borrower.id}`, 3, 86400000))
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Please wait before sending another request",
        });
      const db = getDb();
      const [pending] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.borrowerId, ctx.borrower.id),
            eq(applications.status, "pending")
          )
        )
        .limit(1);
      if (pending)
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a request awaiting review",
        });
      const ref =
        "QL-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
      await db.insert(applications).values({
        ref,
        borrowerId: ctx.borrower.id,
        name: input.name,
        phone: ctx.borrower.phone,
        amount: input.amount,
        durationWeeks: input.durationWeeks,
        purpose: input.purpose,
        district: input.district,
        consentVersion: input.consentVersion,
        confidentialPayload: seal(input, env.appSecret),
      });
      // The application insert is authoritative; a failed optional notification must not encourage duplicate submissions.
      try {
        await db.insert(notifications).values({
          borrowerId: ctx.borrower.id,
          phone: ctx.borrower.phone,
          title: `Request received — ${ref}`,
          body: "Your pilot request was received. It is not a loan offer or a promise of funding.",
        });
      } catch {
        console.warn("Pilot request saved; update notification unavailable");
      }
      return { ref, status: "pending" as const };
    }),
  myApplications: borrowerQuery.query(({ ctx }) =>
    getDb()
      .select({
        ref: applications.ref,
        amount: applications.amount,
        durationWeeks: applications.durationWeeks,
        purpose: applications.purpose,
        status: applications.status,
        decisionNote: applications.decisionNote,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(eq(applications.borrowerId, ctx.borrower.id))
      .orderBy(desc(applications.createdAt))
  ),
  myNotifications: borrowerQuery.query(({ ctx }) =>
    getDb()
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.borrowerId, ctx.borrower.id))
      .orderBy(desc(notifications.createdAt))
  ),
  unreadCount: borrowerQuery.query(async ({ ctx }) => ({
    count: (
      await getDb()
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.borrowerId, ctx.borrower.id),
            isNull(notifications.readAt)
          )
        )
    ).length,
  })),
  markRead: borrowerQuery.mutation(({ ctx }) =>
    getDb()
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.borrowerId, ctx.borrower.id),
          isNull(notifications.readAt)
        )
      )
  ),
  requestDeletion: borrowerQuery.mutation(async ({ ctx }) => {
    await getDb()
      .insert(borrowerRequests)
      .values({ borrowerId: ctx.borrower.id, type: "deletion" })
      .onDuplicateKeyUpdate({ set: { type: "deletion" } });
    return { ok: true };
  }),
  privacyRequests: adminQuery.query(() =>
    getDb()
      .select()
      .from(borrowerRequests)
      .orderBy(desc(borrowerRequests.createdAt))
  ),
  listApplications: adminQuery
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
        })
        .optional()
    )
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
      return input?.status
        ? base.where(eq(applications.status, input.status))
        : base;
    }),

  applicationDetail: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await getDb().query.applications.findFirst({
        where: eq(applications.id, input.id),
      });
      if (!row) return undefined;
      const { confidentialPayload, borrowerTokenHash, ...safe } = row;
      void borrowerTokenHash;
      if (!confidentialPayload)
        return {
          ...safe,
          affordability: null,
          pilotRequest: false,
          monthlyIncome: null,
          monthlyExpenses: null,
          existingDebtPayments: null,
        };
      const data = unseal<ApplicationInput>(confidentialPayload, env.appSecret);
      return {
        ...safe,
        ...data,
        nin: null,
        dob: null,
        gender: null,
        signature: null,
        idFrontPhoto: null,
        idBackPhoto: null,
        livenessPhoto: null,
        income: String(data.monthlyIncome),
        affordability: affordability(data),
        pilotRequest: true,
      };
    }),

  decide: adminQuery
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.approved)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Live lending is disabled: verified identity, final loan terms and payment integration are required first",
        });
      const db = getDb();
      const app = await db.query.applications.findFirst({
        where: eq(applications.id, input.id),
      });
      if (!app) throw new Error("Application not found");
      const status = input.approved ? "approved" : "rejected";
      await db
        .update(applications)
        .set({
          status,
          decisionNote: input.note ?? null,
          decidedAt: new Date(),
        })
        .where(eq(applications.id, input.id));
      await db.insert(notifications).values({
        borrowerId: app.borrowerId,
        phone: app.phone,
        title: input.approved
          ? `🎉 Loan APPROVED — ${app.ref}`
          : `Loan application update — ${app.ref}`,
        body: input.approved
          ? `${app.name}, good news! Your loan of UGX ${app.amount.toLocaleString()} has been APPROVED. ${input.note ?? "Approval is not confirmation of disbursement."}`
          : `${app.name}, unfortunately your loan application of UGX ${app.amount.toLocaleString()} was not approved this time. ${input.note ?? "Please contact the lender if you need clarification."}`,
      });
      return { ok: true, status };
    }),

  stats: adminQuery.query(async () => {
    const db = getDb();
    const all = await db
      .select({ status: applications.status, amount: applications.amount })
      .from(applications);
    return {
      total: all.length,
      pending: all.filter(a => a.status === "pending").length,
      approved: all.filter(a => a.status === "approved").length,
      rejected: all.filter(a => a.status === "rejected").length,
      approvedVolume: all
        .filter(a => a.status === "approved")
        .reduce((s, a) => s + a.amount, 0),
    };
  }),
});

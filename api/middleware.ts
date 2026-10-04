import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ownsPhone, sameOrigin } from "./lib/managed-auth";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin")).use(async ({ ctx, type, next }) => {
  if (type === "mutation" && !sameOrigin(ctx.req)) throw new TRPCError({ code: "FORBIDDEN", message: "Same-origin request required" });
  return next();
});
export const borrowerQuery = publicQuery.use(async ({ ctx, next }) => {
  if (!ctx.borrower?.phone_confirmed_at) throw new TRPCError({ code: "UNAUTHORIZED", message: "Verified phone sign-in required" });
  return next();
});
export function requireOwnedPhone(ctx: TrpcContext, phone: string) {
  if (!ownsPhone(ctx.borrower, phone)) throw new TRPCError({ code: "FORBIDDEN", message: "This record does not belong to your verified phone" });
}

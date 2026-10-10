import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return error.code === "INTERNAL_SERVER_ERROR"
      ? {
          ...shape,
          message: "Service temporarily unavailable. Please try again.",
          data: { ...shape.data, stack: undefined },
        }
      : { ...shape, data: { ...shape.data, stack: undefined } };
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async opts => {
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
  return t.middleware(async opts => {
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
export const adminQuery = authedQuery.use(requireRole("admin"));

export const borrowerQuery = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.borrower)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to your borrower account",
    });
  return next({ ctx: { ...ctx, borrower: ctx.borrower } });
});

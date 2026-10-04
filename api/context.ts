import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateManagedRequest, isLender, type ManagedIdentity } from "./lib/managed-auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  borrower?: ManagedIdentity;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.borrower = await authenticateManagedRequest(opts.req.headers);
    if (isLender(ctx.borrower)) {
      const { findUserByUnionId } = await import("./queries/users");
      ctx.user = await findUserByUnionId(`supabase:${ctx.borrower!.id}`);
    }
  } catch {
    // Authentication is optional here
  }
  return ctx;
}

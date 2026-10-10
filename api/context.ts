import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getBorrower } from "./borrower-auth";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  borrower?: Awaited<ReturnType<typeof getBorrower>>;
};

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }
  ctx.borrower = await getBorrower(opts.req);
  return ctx;
}

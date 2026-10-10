import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import {
  borrowerAuthHandler,
  borrowerLogout,
  getBorrower,
} from "./borrower-auth";
import { isSameOrigin } from "./borrower-security";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

import { lenderLoginHandler } from "./lender-login";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(secureHeaders());
app.use(bodyLimit({ maxSize: 2 * 1024 * 1024 }));
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (
    c.req.method !== "GET" &&
    c.req.method !== "HEAD" &&
    !isSameOrigin(c.req.raw)
  )
    return c.json({ error: "Cross-origin requests are not allowed" }, 403);
  await next();
});
app.post("/api/lender-login", lenderLoginHandler);
app.post("/api/borrower/register", c => borrowerAuthHandler(c, true));
app.post("/api/borrower/login", c => borrowerAuthHandler(c, false));
app.post("/api/borrower/logout", borrowerLogout);
app.get("/api/borrower/me", async c => {
  const borrower = await getBorrower(c.req.raw);
  return c.json(
    borrower
      ? {
          authenticated: true,
          phone: borrower.phone,
          phoneVerified: !!borrower.verified,
        }
      : { authenticated: false }
  );
});
app.get("/api/product", c =>
  c.json({
    mode: "pilot",
    liveLending: false,
    identityVerification: false,
    paymentsConnected: false,
  })
);
app.use("/api/trpc/*", async c => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", c => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { ensureQuickLoanSchema } = await import("./ensure-schema");
  await ensureQuickLoanSchema();
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

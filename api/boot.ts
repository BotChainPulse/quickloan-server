import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { lenderLoginHandler } from "./lender-login";
import { authConfig } from "./lib/managed-auth";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use("/sw.js", async (c, next) => {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("X-Content-Type-Options", "nosniff");
  await next();
});

app.use(bodyLimit({ maxSize: 2 * 1024 * 1024 }));

// CORS is not authentication. Borrower requests require verified bearer tokens.
app.use("/api/trpc/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"] }));
app.use("/api/*", async (c, next) => { c.header("Cache-Control", "no-store"); await next(); });
app.get("/api/auth-config", (c) => {
  const config = authConfig();
  return config ? c.json(config) : c.json({ error: "Secure sign-in is not configured yet" }, 503);
});
app.get("/api/health", (c) => c.json({ service: "quickloan", status: "running", mode: "pilot", lendingEnabled: false }));
app.post("/api/lender-login", lenderLoginHandler);
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

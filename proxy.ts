import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk proxy (formerly "middleware" — Next.js 16 renamed the convention).
 * Required for Clerk to attach user state to server-rendered pages and to
 * gate /paths or /account routes. We're not enforcing any route protection
 * right now — the app is anonymous-by-default — but the proxy still has to
 * run so Clerk's RSC integration works.
 *
 * Clerk's clerkMiddleware() returns a request handler compatible with both
 * the legacy middleware convention and the new proxy convention. Exporting
 * it as default works in both Next.js 15 (middleware.ts) and Next.js 16
 * (proxy.ts).
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on all routes except static files and _next internals.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

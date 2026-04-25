import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk middleware: required for Clerk to attach user state to server-rendered
 * pages and to gate any /paths or /account routes. We're not enforcing any
 * route protection right now — the app is anonymous-by-default — but the
 * middleware still has to run so Clerk's RSC integration works.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run middleware on all routes except static files & _next internals.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

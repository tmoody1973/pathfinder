import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk proxy (formerly "middleware" — Next.js 16 renamed the convention).
 * Required for Clerk to attach user state to server-rendered pages.
 *
 * Anonymous-by-default app — no route protection logic here.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files; run on everything else
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

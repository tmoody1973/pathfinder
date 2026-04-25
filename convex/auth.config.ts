/**
 * Convex auth config — tells Convex which JWT issuer to trust.
 *
 * The Clerk JWT template named "convex" issues these tokens. The Issuer URL
 * is set in the Clerk dashboard under JWT Templates → Convex. We pass it
 * via Convex env var CLERK_ISSUER_URL so the same code works across dev/prod.
 *
 * Set with: bunx convex env set CLERK_ISSUER_URL https://<your-instance>.clerk.accounts.dev
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};

"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run `bunx convex dev` once to populate .env.local.",
  );
}

const convex = new ConvexReactClient(convexUrl);

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Combined provider: Clerk wraps everything, Convex consumes Clerk's auth state
 * via ConvexProviderWithClerk. Anonymous users still work — Convex queries just
 * see no auth identity, which is what our anonymous-by-default code expects.
 *
 * Once authenticated, Convex's ctx.auth.getUserIdentity() returns the Clerk user
 * info (subject = Clerk user ID, email, name).
 */
export function ConvexClerkProvider({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) {
    // Fallback when Clerk keys aren't set yet — falls back to pure Convex.
    // This keeps the anonymous flow working while Clerk is being provisioned.
    // eslint-disable-next-line @next/next/no-sync-scripts
    return (
      <ConvexProviderWithoutAuth client={convex}>{children}</ConvexProviderWithoutAuth>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// Bare Convex provider for the no-Clerk fallback path. Keeps the existing
// anonymous-only behavior working until the Clerk keys are added to env.
function ConvexProviderWithoutAuth({
  client,
  children,
}: {
  client: ConvexReactClient;
  children: ReactNode;
}) {
  // Lazy import to avoid bundling both providers; matches Convex's recommended
  // pattern of having one Provider component.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ConvexProvider } = require("convex/react");
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

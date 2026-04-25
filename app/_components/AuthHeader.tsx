"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SignInButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getAnonymousId } from "./anonymousId";

/**
 * Top-right auth chip. Anonymous by default — shows a small "Save your paths"
 * sign-in button. Signed-in shows the Clerk UserButton (avatar/menu) plus a
 * link to the /paths dashboard.
 *
 * On sign-in transition, AnonymousMigrator auto-claims the user's existing
 * anonymous paths so they don't lose context.
 */
export function AuthHeader() {
  const { isLoaded, isSignedIn } = useAuth();

  // While Clerk is loading, render nothing — avoid auth UI flicker.
  if (!isLoaded) return null;

  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <button
            type="button"
            className="border-2 border-black bg-card hover:bg-accent rounded px-3 py-1.5 text-sm font-head shadow-sm hover:shadow-none active:translate-y-0.5 transition-all"
          >
            Save your paths · Sign in
          </button>
        </SignInButton>
      ) : (
        <>
          <Link
            href="/paths"
            className="border-2 border-black bg-card hover:bg-accent rounded px-3 py-1.5 text-sm font-head shadow-sm hover:shadow-none active:translate-y-0.5 transition-all"
          >
            My Paths
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "border-2 border-black w-9 h-9",
              },
            }}
          />
          <AnonymousMigrator />
        </>
      )}
    </div>
  );
}

/**
 * Runs once after a user becomes authenticated — claims any anonymous paths
 * tied to the current browser's anonymousId, attaching them to the Clerk user.
 *
 * Idempotent: safe to call multiple times. Does nothing if there's no
 * anonymous session, or if it's already been claimed by a different user.
 */
function AnonymousMigrator() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const claim = useMutation(api.sessions.claimAnonymousPaths);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const anonymousId = (() => {
      try {
        return getAnonymousId();
      } catch {
        return null;
      }
    })();
    if (!anonymousId) return;

    // Mark this anonymousId as claimed-for-user so we don't re-call on every render
    const claimedKey = `pathfinder.claimed.${user.id}.${anonymousId}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(claimedKey)) return;

    claim({ anonymousId })
      .then((result) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(claimedKey, "1");
        }
        if (result.claimed > 0) {
          console.log(`[Auth] Claimed ${result.claimed} anonymous paths for user ${user.id}`);
        }
      })
      .catch((err) => {
        console.error("[Auth] Failed to claim anonymous paths:", err);
      });
  }, [isLoaded, isSignedIn, user, claim]);

  return null;
}

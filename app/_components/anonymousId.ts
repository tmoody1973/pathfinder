"use client";

const STORAGE_KEY = "pathfinder.anonymousId";

/**
 * Browser-only helper. Returns a stable anonymous session ID for the current
 * browser, generating one and persisting it on first call. Safe to call from
 * React effects and event handlers; throws if called from server components
 * or during SSR.
 */
export function getAnonymousId(): string {
  if (typeof window === "undefined") {
    throw new Error("getAnonymousId is browser-only — call from useEffect or onClick");
  }
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Anonymous session model — no Clerk, no user accounts.
 * The browser holds an anonymousId in localStorage and sends it on every call.
 * The server materializes a `sessions` row on first contact and reuses it after.
 */

const ONE_HOUR_MS = 60 * 60 * 1000;
// Configurable via Convex env var RATE_LIMIT_PER_HOUR. Dev default is 10 so
// iteration doesn't get blocked; for the public demo deploy set it to 3 via
// `bunx convex env set RATE_LIMIT_PER_HOUR 3 --prod`.
const MAX_GENERATIONS_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR ?? "10");

/** Public query: read a session by its anonymousId, or null if it hasn't been created yet. */
export const getByAnonymousId = query({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }): Promise<Doc<"sessions"> | null> => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_anonymous", (q) => q.eq("anonymousId", anonymousId))
      .unique();
  },
});

/**
 * Internal helper: get the existing session for this anonymousId, or create one.
 * Used by createPath. Always returns a sessions row.
 *
 * Also performs sliding-window pruning of generationTimestamps so the rate-limit
 * check is always accurate.
 */
export const getOrCreate = internalMutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }): Promise<Doc<"sessions">> => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_anonymous", (q) => q.eq("anonymousId", anonymousId))
      .unique();

    const now = Date.now();

    if (existing) {
      // Prune timestamps older than 1 hour
      const recent = existing.generationTimestamps.filter((t) => now - t < ONE_HOUR_MS);
      if (recent.length !== existing.generationTimestamps.length) {
        await ctx.db.patch(existing._id, { generationTimestamps: recent });
        return { ...existing, generationTimestamps: recent };
      }
      return existing;
    }

    const id = await ctx.db.insert("sessions", {
      anonymousId,
      createdAt: now,
      generationTimestamps: [],
      inFlightPathId: undefined,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Failed to create session");
    return created;
  },
});

/** Internal helper: clear the in-flight pointer once a path is no longer running. */
export const clearInFlight = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { inFlightPathId: undefined });
  },
});

/** Rate-limit policy exposed for use in createPath. */
export const RATE_LIMIT = {
  windowMs: ONE_HOUR_MS,
  maxPerWindow: MAX_GENERATIONS_PER_HOUR,
} as const;

/** Dev-friendly escape hatch: clear the rate limit state for the caller's session.
 *  Safe to expose publicly because it only resets the session identified by the
 *  anonymousId the caller controls — no cross-session mutation. Doesn't grant
 *  anyone more API budget than the server was already prepared to give. */
export const resetMyRateLimit = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_anonymous", (q) => q.eq("anonymousId", anonymousId))
      .unique();
    if (!existing) return { reset: false, reason: "no session" };
    await ctx.db.patch(existing._id, {
      generationTimestamps: [],
      inFlightPathId: undefined,
    });
    return { reset: true };
  },
});

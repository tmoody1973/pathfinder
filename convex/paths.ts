import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { RATE_LIMIT } from "./sessions";

/**
 * Public mutation: create a new path generation request.
 *
 * Flow:
 *   1. Resolve session via internal.sessions.getOrCreate (also prunes old timestamps)
 *   2. Enforce sliding-window rate limit (max 3/hour, max 1 in-flight)
 *   3. Insert path with status: "pending"
 *   4. Append now() to session.generationTimestamps + set inFlightPathId
 *   5. Schedule the orchestrate action — fire-and-forget
 *   6. Return the new pathId so the client can subscribe to it
 *
 * Errors are thrown as ConvexError so the client can distinguish them from network failures.
 */
export const createPath = mutation({
  args: {
    anonymousId: v.string(),
    currentCareer: v.string(),
    targetCareer: v.string(),
    hoursPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"paths">> => {
    const currentTrim = args.currentCareer.trim();
    const targetTrim = args.targetCareer.trim();
    if (currentTrim.length === 0 || targetTrim.length === 0) {
      throw new ConvexError({ kind: "invalid_input", message: "Both careers are required." });
    }
    if (currentTrim.toLowerCase() === targetTrim.toLowerCase()) {
      throw new ConvexError({
        kind: "invalid_input",
        message: "Pick two different careers — there's no bridge to compute otherwise.",
      });
    }

    const session = await ctx.runMutation(internal.sessions.getOrCreate, {
      anonymousId: args.anonymousId,
    });

    if (session.inFlightPathId) {
      throw new ConvexError({
        kind: "rate_limited",
        message: "Another generation is already running. Please wait for it to complete.",
      });
    }

    if (session.generationTimestamps.length >= RATE_LIMIT.maxPerWindow) {
      const oldest = Math.min(...session.generationTimestamps);
      const waitMs = RATE_LIMIT.windowMs - (Date.now() - oldest);
      const waitMinutes = Math.max(1, Math.ceil(waitMs / 60_000));
      throw new ConvexError({
        kind: "rate_limited",
        message: `You've hit the hourly limit (${RATE_LIMIT.maxPerWindow}/hour). Try again in ~${waitMinutes} minutes.`,
      });
    }

    // Clamp hours/week to a sensible range. Below 1 isn't useful; above 40 is
    // basically a full-time student and the path doesn't need re-pacing for that.
    const hoursPerWeek =
      typeof args.hoursPerWeek === "number" && Number.isFinite(args.hoursPerWeek)
        ? Math.max(1, Math.min(40, Math.round(args.hoursPerWeek)))
        : undefined;

    const now = Date.now();
    const pathId = await ctx.db.insert("paths", {
      sessionId: session._id,
      currentCareer: currentTrim,
      currentONET: "", // resolved by orchestrator
      targetCareer: targetTrim,
      targetONET: "",
      status: "pending",
      hoursPerWeek,
      createdAt: now,
    });

    await ctx.db.patch(session._id, {
      generationTimestamps: [...session.generationTimestamps, now],
      inFlightPathId: pathId,
    });

    // Fire-and-forget — orchestrator runs async, UI subscribes to live queries
    await ctx.scheduler.runAfter(0, internal.orchestrate.run, { pathId });

    return pathId;
  },
});

/**
 * Public query: get a single path by id. Returns null while the path doesn't exist
 * (e.g., before mutation finishes propagating). The UI uses this with `useQuery` for live updates.
 */
export const get = query({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"paths"> | null> => {
    return await ctx.db.get(pathId);
  },
});

/**
 * Public query: list all paths for a session, newest first. Used by the homepage
 * to show "your previous attempts" if you want a quick navigation surface.
 */
export const listForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }): Promise<Doc<"paths">[]> => {
    return await ctx.db
      .query("paths")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(20);
  },
});

// === Internal helpers used by the orchestrator action ===

/** Internal query: read a path inside the orchestrator action. (Node-runtime
 *  files like orchestrate.ts cannot define queries themselves.) */
export const getInternal = internalQuery({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"paths"> | null> => {
    return await ctx.db.get(pathId);
  },
});

/**
 * Set the lifecycle status on a path. Optionally set errorReason (for status === "error").
 * Optionally set ONET resolution data when phase 1 completes.
 */
export const setStatus = internalMutation({
  args: {
    pathId: v.id("paths"),
    status: v.union(
      v.literal("pending"),
      v.literal("diffing"),
      v.literal("generating"),
      v.literal("done"),
      v.literal("error"),
      v.literal("cached"),
      v.literal("timeout"),
    ),
    errorReason: v.optional(v.string()),
    currentONET: v.optional(v.string()),
    currentReasoning: v.optional(v.string()),
    targetONET: v.optional(v.string()),
    targetReasoning: v.optional(v.string()),
    pathOutline: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { pathId, ...rest } = args;
    // Strip undefined keys so we don't overwrite existing fields
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(pathId, patch);
  },
});

/**
 * Clear inFlightPathId on the session that owns this path. Called by the orchestrator
 * in its `finally` block so the rate limiter knows the slot is free.
 */
export const clearInFlightForPath = internalMutation({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }) => {
    const path = await ctx.db.get(pathId);
    if (!path) return;
    const session = await ctx.db.get(path.sessionId);
    if (!session) return;
    if (session.inFlightPathId === pathId) {
      await ctx.db.patch(session._id, { inFlightPathId: undefined });
    }
  },
});

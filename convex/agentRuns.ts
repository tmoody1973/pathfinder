import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * agentRuns table tracks each parallel agent's lifecycle for a path.
 * The student UI subscribes to this table — every status change animates
 * the corresponding agent tile (pending → running → done | error).
 */

const agentLiteral = v.union(
  v.literal("skillDiff"),
  v.literal("lesson"),
  v.literal("resource"),
  v.literal("assessment"),
  v.literal("audio"),
  v.literal("course"),
  v.literal("community"),
  v.literal("books"),
);

const statusLiteral = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("error"),
  v.literal("skipped"),
);

/** Insert a new agentRuns row in `pending` state. Called once per agent at the
 *  start of the orchestrator before any work begins so the UI shows all five
 *  tiles immediately. */
export const insertPending = internalMutation({
  args: { pathId: v.id("paths"), agent: agentLiteral },
  handler: async (ctx, { pathId, agent }): Promise<Id<"agentRuns">> => {
    return await ctx.db.insert("agentRuns", {
      pathId,
      agent,
      status: "pending",
    });
  },
});

/** Mark an agent as running and record the start time. */
export const markRunning = internalMutation({
  args: { runId: v.id("agentRuns") },
  handler: async (ctx, { runId }) => {
    await ctx.db.patch(runId, {
      status: "running",
      startedAt: Date.now(),
    });
  },
});

/** Mark an agent as completed successfully and store its output. */
export const markDone = internalMutation({
  args: { runId: v.id("agentRuns"), output: v.any() },
  handler: async (ctx, { runId, output }) => {
    await ctx.db.patch(runId, {
      status: "done",
      output,
      finishedAt: Date.now(),
    });
  },
});

/** Mark an agent as failed and store the error message. The pipeline continues
 *  with degraded results (the corresponding UI tile shows "data unavailable"). */
export const markError = internalMutation({
  args: { runId: v.id("agentRuns"), errorMessage: v.string() },
  handler: async (ctx, { runId, errorMessage }) => {
    await ctx.db.patch(runId, {
      status: "error",
      errorMessage,
      finishedAt: Date.now(),
    });
  },
});

/** Public query: list all runs for a path, ordered for stable display. UI subscribes here. */
export const listForPath = query({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"agentRuns">[]> => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .collect();
  },
});

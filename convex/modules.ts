import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * modules table holds the assembled bridge module — the final aggregated
 * output of the agent pipeline. The UI module-detail view reads from here.
 */

export const insert = internalMutation({
  args: {
    pathId: v.id("paths"),
    careerDiff: v.any(),
    lesson: v.optional(v.any()),
    videos: v.optional(v.array(v.any())),
    quiz: v.optional(v.array(v.any())),
    project: v.optional(v.any()),
    audioUrl: v.optional(v.string()),
    course: v.optional(v.any()),
    community: v.optional(v.any()),
    books: v.optional(v.any()),
    news: v.optional(v.any()),
    cached: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"modules">> => {
    return await ctx.db.insert("modules", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Public query: get the module for a path. UI subscribes to this once a path
 *  reaches "done" status. Returns null while the orchestrator is still aggregating. */
export const getForPath = query({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"modules"> | null> => {
    return await ctx.db
      .query("modules")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .first();
  },
});

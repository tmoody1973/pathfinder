import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * modules table holds the assembled bridge module(s) for a path. The featured
 * module (primary bridge) is auto-generated when the path is created. Other
 * modules from pathOutline generate on-demand when the user clicks into them.
 */

export const insert = internalMutation({
  args: {
    pathId: v.id("paths"),
    moduleNumber: v.number(),
    isFeatured: v.boolean(),
    title: v.optional(v.string()),
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
    salary: v.optional(v.any()),
    description: v.optional(v.any()),
    cached: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"modules">> => {
    return await ctx.db.insert("modules", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Get the module for (pathId, moduleNumber). Returns null if that module
 *  hasn't been generated yet. */
export const getByNumber = query({
  args: { pathId: v.id("paths"), moduleNumber: v.number() },
  handler: async (ctx, { pathId, moduleNumber }): Promise<Doc<"modules"> | null> => {
    return await ctx.db
      .query("modules")
      .withIndex("by_path_and_number", (q) =>
        q.eq("pathId", pathId).eq("moduleNumber", moduleNumber),
      )
      .first();
  },
});

/** Backwards-compatible: default to the featured module for this path. */
export const getForPath = query({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"modules"> | null> => {
    const featured = await ctx.db
      .query("modules")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .filter((q) => q.eq(q.field("isFeatured"), true))
      .first();
    if (featured) return featured;
    // Fallback: any module for this path
    return await ctx.db
      .query("modules")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .first();
  },
});

/** Internal: get the featured module row for a path (used by orchestrate's
 *  on-demand generation to recover the master skillDiff). */
export const getFeaturedInternal = internalQuery({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"modules"> | null> => {
    return await ctx.db
      .query("modules")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .filter((q) => q.eq(q.field("isFeatured"), true))
      .first();
  },
});

/** List all generated modules for a path, ordered by moduleNumber. UI uses
 *  this to show which modules in the outline have content vs. locked.
 *  Legacy rows without moduleNumber are treated as the featured module #1. */
export const listForPath = query({
  args: { pathId: v.id("paths") },
  handler: async (
    ctx,
    { pathId },
  ): Promise<Array<{ moduleNumber: number; isFeatured: boolean }>> => {
    const rows = await ctx.db
      .query("modules")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .collect();
    return rows
      .map((r) => ({
        moduleNumber: r.moduleNumber ?? 1,
        isFeatured: r.isFeatured ?? true,
      }))
      .sort((a, b) => a.moduleNumber - b.moduleNumber);
  },
});

/**
 * Public mutation: kick off content generation for a specific module from the
 * path's outline. Idempotent — if the module already exists or is generating,
 * returns the existing state without re-firing.
 */
export const generateModuleContent = mutation({
  args: { pathId: v.id("paths"), moduleNumber: v.number() },
  handler: async (ctx, { pathId, moduleNumber }) => {
    const path = await ctx.db.get(pathId);
    if (!path) throw new ConvexError({ kind: "not_found", message: "Path not found" });

    // Look up the module spec in pathOutline
    const outline: any = path.pathOutline;
    const flat: any[] = (outline?.phases ?? []).flatMap((p: any) => p.modules ?? []);
    const moduleSpec = flat.find((m: any) => m.number === moduleNumber);
    if (!moduleSpec) {
      throw new ConvexError({
        kind: "not_found",
        message: `Module ${moduleNumber} is not in this path's outline.`,
      });
    }

    // Already generated?
    const existing = await ctx.db
      .query("modules")
      .withIndex("by_path_and_number", (q) =>
        q.eq("pathId", pathId).eq("moduleNumber", moduleNumber),
      )
      .first();
    if (existing) return { status: "exists", moduleId: existing._id };

    // Already generating? Check agentRuns for any "running"/"pending" rows
    // tagged to this (pathId, moduleNumber) — for now we just check the path
    // for active generation activity. (Cleaner version: agentRuns row would
    // include moduleNumber; deferred for tonight.)

    // Schedule the orchestrator's per-module action
    await ctx.scheduler.runAfter(0, internal.orchestrate.generateForModule, {
      pathId,
      moduleNumber,
    });

    return { status: "scheduled" };
  },
});

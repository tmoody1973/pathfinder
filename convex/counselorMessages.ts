import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/** Public query: list all messages for a path's counselor conversation. */
export const listMessages = query({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Doc<"counselorMessages">[]> => {
    return await ctx.db
      .query("counselorMessages")
      .withIndex("by_path", (q) => q.eq("pathId", pathId))
      .order("asc")
      .collect();
  },
});

/** Internal: append one message to the conversation log. Called by the
 *  counselor action after persisting a user turn or completing a Sonnet reply. */
export const appendMessage = internalMutation({
  args: {
    pathId: v.id("paths"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("counselorMessages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

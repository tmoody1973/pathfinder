import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

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

/**
 * Internal: insert an empty assistant message and return its ID. Used by the
 * streaming counselor to seat a placeholder row immediately, then patch its
 * `content` field as Sonnet's tokens arrive. UI subscribes to listMessages
 * and renders the message growing in real time.
 */
export const insertEmptyAssistant = internalMutation({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<Id<"counselorMessages">> => {
    return await ctx.db.insert("counselorMessages", {
      pathId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: patch an in-flight assistant message's content. Called by the
 * streaming counselor every ~250ms with the accumulated text so far, plus
 * once at the end with the final text.
 */
export const updateMessageContent = internalMutation({
  args: {
    messageId: v.id("counselorMessages"),
    content: v.string(),
  },
  handler: async (ctx, { messageId, content }) => {
    await ctx.db.patch(messageId, { content });
  },
});

/**
 * Internal: attach an audio URL to a finished assistant message. Called by
 * voice.synthesize once ElevenLabs returns the TTS audio and we've stored it
 * in Convex file storage. Live query subscribers see the URL appear and can
 * auto-play it.
 */
export const updateMessageAudio = internalMutation({
  args: {
    messageId: v.id("counselorMessages"),
    audioUrl: v.string(),
  },
  handler: async (ctx, { messageId, audioUrl }) => {
    await ctx.db.patch(messageId, { audioUrl });
  },
});

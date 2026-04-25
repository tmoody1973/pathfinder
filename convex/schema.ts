import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * PathFinder Blackathon — Convex schema
 *
 * Anonymous-session model: localStorage holds an UUID, every mutation/query
 * is keyed off that. No Clerk, no user accounts. See design doc § 3.
 *
 * Sliding-window rate limit: sessions.generationTimestamps is pruned to the
 * last 3600s on every createPath mutation. >=3 entries OR a non-null
 * inFlightPathId means deny with ConvexError("rate_limited").
 */
export default defineSchema({
  sessions: defineTable({
    anonymousId: v.string(),
    createdAt: v.number(),
    generationTimestamps: v.array(v.number()),
    inFlightPathId: v.optional(v.id("paths")),
  }).index("by_anonymous", ["anonymousId"]),

  paths: defineTable({
    sessionId: v.id("sessions"),
    currentCareer: v.string(),
    currentONET: v.string(),
    currentReasoning: v.optional(v.string()),
    targetCareer: v.string(),
    targetONET: v.string(),
    targetReasoning: v.optional(v.string()),
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
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  agentRuns: defineTable({
    pathId: v.id("paths"),
    agent: v.union(
      v.literal("skillDiff"),
      v.literal("lesson"),
      v.literal("resource"),
      v.literal("assessment"),
      v.literal("audio"),
      v.literal("course"),
      v.literal("community"),
      v.literal("books"),
      v.literal("news"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error"),
      v.literal("skipped"),
    ),
    output: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_path", ["pathId"]),

  modules: defineTable({
    pathId: v.id("paths"),
    careerDiff: v.any(),                 // SkillDiffResult: current, target, diff, headline
    lesson: v.optional(v.any()),         // LessonResult: { intro, sections: [...] }
    videos: v.optional(v.array(v.any())),
    audioUrl: v.optional(v.string()),
    quiz: v.optional(v.array(v.any())),
    project: v.optional(v.any()),
    course: v.optional(v.any()),         // CourseResult: { moocs, source, socCode }
    community: v.optional(v.any()),      // CommunityResult: { communities, people, newsletters, source, socCode }
    books: v.optional(v.any()),          // BooksResult: { queries, books: [...] }
    news: v.optional(v.any()),           // NewsResult: { items, citations }
    cached: v.boolean(),
    createdAt: v.number(),
  }).index("by_path", ["pathId"]),
});

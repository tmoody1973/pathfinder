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
    userId: v.optional(v.string()),  // Clerk subject ID once user signs in. Sessions migrate from anonymous → authenticated.
    createdAt: v.number(),
    generationTimestamps: v.array(v.number()),
    inFlightPathId: v.optional(v.id("paths")),
  })
    .index("by_anonymous", ["anonymousId"])
    .index("by_user", ["userId"]),

  paths: defineTable({
    sessionId: v.id("sessions"),
    userId: v.optional(v.string()),  // Clerk user ID — populated after a user authenticates. Anonymous paths get this on sign-in via migration.
    currentCareer: v.string(),
    currentONET: v.string(),
    currentReasoning: v.optional(v.string()),
    targetCareer: v.string(),
    targetONET: v.string(),
    targetReasoning: v.optional(v.string()),
    hoursPerWeek: v.optional(v.number()),  // user-stated time availability — re-paces the path
    city: v.optional(v.string()),  // user's city/metro for location-specific salary lookup
    profileText: v.optional(v.string()),  // pasted LinkedIn About+Experience or resume — personalizes the bridge
    interests: v.optional(v.string()),  // free-text "what I actually enjoy" — flows to counselor + lesson narrative
    currentSalary: v.optional(v.number()),  // user's actual current annual salary — personalizes salary lift math vs median
    title: v.optional(v.string()),  // user-editable nickname for this path, defaults to "current → target"
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
    pathOutline: v.optional(v.any()),  // generated upfront with skillDiff: phases + modules + bridge marker
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

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
      v.literal("salary"),
      v.literal("description"),
      v.literal("scholar"),
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

  // Counselor chat: messages persisted per path so the user can refresh
  // mid-conversation without losing context. Anonymous-session-scoped.
  // audioUrl is populated by voice.synthesize after TTS completes (assistant
  // messages only) — UI plays this when the user has voice mode on.
  counselorMessages: defineTable({
    pathId: v.id("paths"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    audioUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_path", ["pathId"]),

  modules: defineTable({
    pathId: v.id("paths"),
    moduleNumber: v.optional(v.number()),  // 1..N within the path's outline. Optional for backward-compat with rows from before this field existed.
    isFeatured: v.optional(v.boolean()),   // true for the primary-bridge module auto-generated on path creation
    title: v.optional(v.string()),       // mirrors pathOutline module title for fast lookup
    careerDiff: v.any(),                 // SkillDiffResult, may be specialized to this module's bridge
    lesson: v.optional(v.any()),
    videos: v.optional(v.array(v.any())),
    audioUrl: v.optional(v.string()),
    quiz: v.optional(v.array(v.any())),
    project: v.optional(v.any()),
    course: v.optional(v.any()),
    community: v.optional(v.any()),
    books: v.optional(v.any()),
    news: v.optional(v.any()),
    salary: v.optional(v.any()),
    description: v.optional(v.any()),
    scholar: v.optional(v.any()),
    cached: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_path", ["pathId"])
    .index("by_path_and_number", ["pathId", "moduleNumber"]),
});

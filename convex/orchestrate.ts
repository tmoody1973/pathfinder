"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Orchestrator action — STUB. Build order step 4-5 fills this in.
 *
 * Final shape (per design doc):
 *   Phase 1: Resolve both careers via semanticOnetLookup (Layer 1/2/3)
 *   Phase 2: Skill Diff Agent (Opus 4.7) — writes agentRuns row, updates path.status = "generating"
 *   Phase 3: Promise.allSettled([Lesson, Resource, Assessment, (Audio if stretch)])
 *            Each call wrapped in Promise.race against a 30s timeout. Each
 *            updates its own agentRuns row at start (running) and finish (done|error).
 *   Phase 4: Aggregate results into modules row
 *   Phase 5: Set path.status = "done", clear session.inFlightPathId
 *
 * Right now this is a stub: it transitions a path through statuses so the
 * UI wiring (step 6) can be tested against real reactive state changes
 * before any Anthropic calls are wired in.
 */
export const run = internalAction({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<void> => {
    try {
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "diffing" });

      // TODO step 4: invoke Skill Diff Agent (Opus 4.7) here, write agentRuns row
      // TODO step 5: Promise.allSettled([lesson, resource, assessment, audio])
      // TODO step 5: aggregate results into modules row via internal.modules.insert

      // STUB: simulate the pipeline running so the UI can render real state changes.
      // Remove once the real pipeline is wired up.
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "generating" });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "error",
        errorReason: message,
      });
    } finally {
      await ctx.runMutation(internal.paths.clearInFlightForPath, { pathId });
    }
  },
});

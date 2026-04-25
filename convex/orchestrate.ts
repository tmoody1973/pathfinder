"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { runSkillDiffAgent } from "./agents/skillDiff";

/**
 * Orchestrator action — drives the full agent pipeline for a single path.
 *
 * Phase 1: Resolve both careers via semanticOnetLookup (Layer 1/2/3).
 * Phase 2: Skill Diff Agent (Opus 4.7) — runs Layer-3 lookup + deterministic
 *          diff + Opus narration. Writes its agentRuns row.
 * Phase 3: STUB — Promise.allSettled([Lesson, Resource, Assessment, (Audio)])
 *          fills in step 5 of the build order.
 * Phase 4: STUB — Aggregate into modules row.
 * Phase 5: Set path.status = "done", clear inFlightPathId.
 *
 * Errors at any phase: set path.status = "error", record reason, still clear inFlight.
 */
export const run = internalAction({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<void> => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Pre-create all agentRuns rows so the UI can render all five tiles immediately
    const skillDiffRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "skillDiff",
    });
    // Step 5 will pre-create lesson/resource/assessment rows here too.

    try {
      // Read the path to get the career inputs
      const path = await ctx.runQuery(internal.orchestrate.getPathInternal, { pathId });
      if (!path) throw new Error(`Path ${pathId} not found`);

      // === Phase 1+2+3: Skill Diff Agent ===
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "diffing" });
      await ctx.runMutation(internal.agentRuns.markRunning, { runId: skillDiffRunId });

      const skillDiff = await runSkillDiffAgent(
        anthropic,
        path.currentCareer,
        path.targetCareer,
      );

      // Persist the resolved ONET codes + reasoning on the path row so the UI can render them
      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "generating",
        currentONET: skillDiff.current.socCode,
        currentReasoning: skillDiff.current.reasoning,
        targetONET: skillDiff.target.socCode,
        targetReasoning: skillDiff.target.reasoning,
      });

      // Persist the full skill-diff output so downstream agents (and the UI) can read it
      await ctx.runMutation(internal.agentRuns.markDone, {
        runId: skillDiffRunId,
        output: skillDiff,
      });

      // === Phase 3 STUB: parallel content agents ===
      // TODO step 5: Lesson, Resource, Assessment in parallel.
      // For now: simulate completion so the UI wiring (step 6) can be tested end-to-end.
      await new Promise((resolve) => setTimeout(resolve, 500));

      // === Phase 4 STUB: aggregate into modules ===
      // TODO step 5: write modules row with skillDiff + lesson + videos + quiz + project.

      // === Phase 5: complete ===
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[orchestrate.run] pathId=${pathId} error:`, message);

      // Mark the in-flight skillDiff agent as errored if it didn't reach markDone
      await ctx.runMutation(internal.agentRuns.markError, {
        runId: skillDiffRunId,
        errorMessage: message,
      }).catch(() => {});

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

// Internal helper: needs to be a query so the action can read the path during execution.
import { internalQuery } from "./_generated/server";

export const getPathInternal = internalQuery({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }) => {
    return await ctx.db.get(pathId);
  },
});

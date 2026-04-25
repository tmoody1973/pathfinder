"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./agents/skillDiff";
import { runPureSkillDiff } from "./agents/pureSkillDiff";
import { runLessonAgent } from "./agents/lesson";
import { runResourceAgent } from "./agents/resource";
import { runAssessmentAgent } from "./agents/assessment";
import { runCourseAgent } from "./agents/course";
import { runCommunityAgent } from "./agents/community";
import { runBooksAgent } from "./agents/books";
import { runNewsAgent } from "./agents/news";
import type { Id } from "./_generated/dataModel";

/**
 * Orchestrator — drives the full agent pipeline for a single path.
 *
 * Phase 1 (sequential): Skill Diff Agent (Opus 4.7) — resolves both careers
 *   via Layer 1/2/3 lookup, runs deterministic diff, narrates headline bridge.
 * Phase 2 (parallel):    Lesson + Resource + Assessment agents (Haiku 4.5).
 *   Each wrapped in a 30s timeout; failures degrade gracefully (the tile shows
 *   "data unavailable" but the rest of the module still renders).
 * Phase 3:               Aggregate everything into a modules row.
 * Phase 4:               Mark path "done", clear inFlightPathId.
 *
 * Errors at any phase: set path.status = "error", record reason, still clear inFlight.
 */

const AGENT_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export const run = internalAction({
  args: { pathId: v.id("paths") },
  handler: async (ctx, { pathId }): Promise<void> => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Pre-create agentRuns rows so the UI shows all six tiles immediately
    const skillDiffRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "skillDiff",
    });
    const lessonRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "lesson",
    });
    const resourceRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "resource",
    });
    const assessmentRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "assessment",
    });
    const courseRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "course",
    });
    const communityRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "community",
    });
    const booksRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "books",
    });
    const newsRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "news",
    });

    let skillDiff: SkillDiffResult;

    try {
      const path = await ctx.runQuery(internal.paths.getInternal, { pathId });
      if (!path) throw new Error(`Path ${pathId} not found`);

      // === Phase 1: Skill Diff Agent (sequential, gates the rest) ===
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "diffing" });
      await ctx.runMutation(internal.agentRuns.markRunning, { runId: skillDiffRunId });

      skillDiff = await withTimeout(
        runPureSkillDiff(anthropic, path.currentCareer, path.targetCareer),
        AGENT_TIMEOUT_MS,
        "skillDiff",
      );

      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "generating",
        currentONET: skillDiff.current.socCode,
        currentReasoning: skillDiff.current.reasoning,
        targetONET: skillDiff.target.socCode,
        targetReasoning: skillDiff.target.reasoning,
      });

      await ctx.runMutation(internal.agentRuns.markDone, {
        runId: skillDiffRunId,
        output: skillDiff,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[orchestrate.run] skillDiff failed for ${pathId}:`, message);

      await ctx.runMutation(internal.agentRuns.markError, {
        runId: skillDiffRunId,
        errorMessage: message,
      }).catch(() => {});

      // skillDiff is the gate. Mark all downstream agents as skipped, fail the path.
      for (const id of [lessonRunId, resourceRunId, assessmentRunId, courseRunId, communityRunId, booksRunId, newsRunId]) {
        await ctx.runMutation(internal.agentRuns.markError, {
          runId: id,
          errorMessage: "Skipped — skill-diff gate failed",
        }).catch(() => {});
      }
      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "error",
        errorReason: message,
      });
      await ctx.runMutation(internal.paths.clearInFlightForPath, { pathId });
      return;
    }

    // === Phase 2: five content agents in parallel ===
    const lessonPromise = runAgentSettled(
      ctx,
      lessonRunId,
      "lesson",
      () => withTimeout(runLessonAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "lesson"),
    );
    const resourcePromise = runAgentSettled(
      ctx,
      resourceRunId,
      "resource",
      () => withTimeout(runResourceAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "resource"),
    );
    const assessmentPromise = runAgentSettled(
      ctx,
      assessmentRunId,
      "assessment",
      () => withTimeout(runAssessmentAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "assessment"),
    );
    const coursePromise = runAgentSettled(
      ctx,
      courseRunId,
      "course",
      () => withTimeout(runCourseAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "course"),
    );
    const communityPromise = runAgentSettled(
      ctx,
      communityRunId,
      "community",
      () => withTimeout(runCommunityAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "community"),
    );
    const booksPromise = runAgentSettled(
      ctx,
      booksRunId,
      "books",
      () => withTimeout(runBooksAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "books"),
    );
    const newsPromise = runAgentSettled(
      ctx,
      newsRunId,
      "news",
      () => withTimeout(runNewsAgent(anthropic, skillDiff), AGENT_TIMEOUT_MS, "news"),
    );

    const [
      lessonResult,
      resourceResult,
      assessmentResult,
      courseResult,
      communityResult,
      booksResult,
      newsResult,
    ] = await Promise.all([
      lessonPromise,
      resourcePromise,
      assessmentPromise,
      coursePromise,
      communityPromise,
      booksPromise,
      newsPromise,
    ]);

    // === Phase 3: Aggregate into modules row ===
    try {
      await ctx.runMutation(internal.modules.insert, {
        pathId,
        careerDiff: skillDiff,
        lesson: lessonResult ?? undefined,
        videos: resourceResult?.videos ?? undefined,
        quiz: assessmentResult?.quiz ?? undefined,
        project: assessmentResult?.project ?? undefined,
        course: courseResult ?? undefined,
        community: communityResult ?? undefined,
        books: booksResult ?? undefined,
        news: newsResult ?? undefined,
        cached: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[orchestrate.run] aggregation failed for ${pathId}:`, message);
      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "error",
        errorReason: `Aggregation failed: ${message}`,
      });
      await ctx.runMutation(internal.paths.clearInFlightForPath, { pathId });
      return;
    }

    // === Phase 4: Done ===
    await ctx.runMutation(internal.paths.setStatus, { pathId, status: "done" });
    await ctx.runMutation(internal.paths.clearInFlightForPath, { pathId });
  },
});

/**
 * Run a single content agent inside Phase 2 with proper agentRuns lifecycle.
 * Returns the result on success or null on failure (logs the error to the row).
 * Never throws — caller can always continue with partial data.
 */
async function runAgentSettled<T>(
  ctx: any,
  runId: Id<"agentRuns">,
  label: string,
  work: () => Promise<T>,
): Promise<T | null> {
  try {
    await ctx.runMutation(internal.agentRuns.markRunning, { runId });
    const output = await work();
    await ctx.runMutation(internal.agentRuns.markDone, { runId, output });
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrate.${label}] failed:`, message);
    await ctx.runMutation(internal.agentRuns.markError, {
      runId,
      errorMessage: message,
    }).catch(() => {});
    return null;
  }
}


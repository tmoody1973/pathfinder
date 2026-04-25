"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import type {
  SkillDiffResult,
  PathOutlineModule,
  PathOutline,
} from "./agents/skillDiff";
import { runPureSkillDiff } from "./agents/pureSkillDiff";
import { runLessonAgent } from "./agents/lesson";
import { runResourceAgent } from "./agents/resource";
import { runAssessmentAgent } from "./agents/assessment";
import { runCourseAgent } from "./agents/course";
import { runCommunityAgent } from "./agents/community";
import { runBooksAgent } from "./agents/books";
import { runNewsAgent } from "./agents/news";
import { runSalaryAgent } from "./agents/salary";
import { runDescriptionAgent } from "./agents/description";
import { runScholarAgent } from "./agents/scholar";
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

// Bumped from 30s to 60s. Anthropic API tonight is generating at 40-80
// tokens/sec for structured JSON output (vs the typical 80-150). Agents
// like lesson and books that produce 2000+ tokens were hitting the 30s
// wall consistently. 60s gives genuine headroom under load without
// blocking the rest of the parallel pipeline.
const AGENT_TIMEOUT_MS = 60_000;
// Skill Diff is the only Opus 4.7 call AND it now produces both the skill
// profiles + the full 12-module pathOutline (~6000 output tokens). Opus at
// that scale takes 30-60s. Give it 90s of headroom; the rest of the pipeline
// fans out in parallel after, so a slower skillDiff doesn't slow the demo.
const SKILL_DIFF_TIMEOUT_MS = 90_000;
// Description (now on Haiku 4.5 with a tightened prompt; was Sonnet originally).
// Generating ~1500 tokens of structured JSON across 9 sections. Should
// complete in 15-30s under normal Anthropic load, but during demo crunch
// or rate-limit pressure can spike to 60-90s. 120s gives genuine headroom
// without holding up the rest of the pipeline (description runs in parallel
// with the other content agents, so a slow description doesn't slow them).
const DESCRIPTION_TIMEOUT_MS = 120_000;

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
    const salaryRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "salary",
    });
    const descriptionRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "description",
    });
    const scholarRunId = await ctx.runMutation(internal.agentRuns.insertPending, {
      pathId,
      agent: "scholar",
    });

    const path = await ctx.runQuery(internal.paths.getInternal, { pathId });
    if (!path) throw new Error(`Path ${pathId} not found`);

    let skillDiff: SkillDiffResult;

    try {

      // === Phase 1: Skill Diff Agent (sequential, gates the rest) ===
      await ctx.runMutation(internal.paths.setStatus, { pathId, status: "diffing" });
      await ctx.runMutation(internal.agentRuns.markRunning, { runId: skillDiffRunId });

      skillDiff = await withTimeout(
        runPureSkillDiff(
          anthropic,
          path.currentCareer,
          path.targetCareer,
          path.profileText,
        ),
        SKILL_DIFF_TIMEOUT_MS,
        "skillDiff",
      );

      await ctx.runMutation(internal.paths.setStatus, {
        pathId,
        status: "generating",
        currentONET: skillDiff.current.socCode,
        currentReasoning: skillDiff.current.reasoning,
        targetONET: skillDiff.target.socCode,
        targetReasoning: skillDiff.target.reasoning,
        pathOutline: skillDiff.pathOutline,
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
      for (const id of [lessonRunId, resourceRunId, assessmentRunId, courseRunId, communityRunId, booksRunId, newsRunId, salaryRunId]) {
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
    const lessonExtras = {
      profileText: path.profileText,
      interests: path.interests,
      hoursPerWeek: path.hoursPerWeek,
    };
    const lessonPromise = runAgentSettled(
      ctx,
      lessonRunId,
      "lesson",
      () => withTimeout(runLessonAgent(anthropic, skillDiff, lessonExtras), AGENT_TIMEOUT_MS, "lesson"),
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
    const salaryPromise = runAgentSettled(
      ctx,
      salaryRunId,
      "salary",
      () =>
        withTimeout(
          runSalaryAgent({
            currentCareer: path.currentCareer,
            targetCareer: path.targetCareer,
            city: path.city ?? undefined,
          }),
          AGENT_TIMEOUT_MS,
          "salary",
        ),
    );
    const descriptionPromise = runAgentSettled(
      ctx,
      descriptionRunId,
      "description",
      () => withTimeout(runDescriptionAgent(anthropic, skillDiff), DESCRIPTION_TIMEOUT_MS, "description"),
    );
    const scholarPromise = runAgentSettled(
      ctx,
      scholarRunId,
      "scholar",
      () =>
        withTimeout(
          runScholarAgent({
            targetCareer: path.targetCareer,
            bridgeTopic: skillDiff.headline?.primaryBridge?.name,
          }),
          AGENT_TIMEOUT_MS,
          "scholar",
        ),
    );

    const [
      lessonResult,
      resourceResult,
      assessmentResult,
      courseResult,
      communityResult,
      booksResult,
      newsResult,
      salaryResult,
      descriptionResult,
      scholarResult,
    ] = await Promise.all([
      lessonPromise,
      resourcePromise,
      assessmentPromise,
      coursePromise,
      communityPromise,
      booksPromise,
      newsPromise,
      salaryPromise,
      descriptionPromise,
      scholarPromise,
    ]);

    // === Phase 3: Aggregate into modules row ===
    // Identify the featured module from pathOutline so this row is keyed by
    // its real moduleNumber (used by on-demand generation to know which
    // module is which).
    const featuredModule = findFeaturedModule(skillDiff.pathOutline);
    const featuredNumber = featuredModule?.number ?? 1;
    const featuredTitle = featuredModule?.title;

    try {
      await ctx.runMutation(internal.modules.insert, {
        pathId,
        moduleNumber: featuredNumber,
        isFeatured: true,
        title: featuredTitle,
        careerDiff: skillDiff,
        lesson: lessonResult ?? undefined,
        videos: resourceResult?.videos ?? undefined,
        quiz: assessmentResult?.quiz ?? undefined,
        project: assessmentResult?.project ?? undefined,
        course: courseResult ?? undefined,
        community: communityResult ?? undefined,
        books: booksResult ?? undefined,
        news: newsResult ?? undefined,
        salary: salaryResult ?? undefined,
        description: descriptionResult ?? undefined,
        scholar: scholarResult ?? undefined,
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

/** Find the primary-bridge module in a pathOutline. */
function findFeaturedModule(
  outline: PathOutline | undefined,
): PathOutlineModule | undefined {
  if (!outline) return undefined;
  for (const phase of outline.phases ?? []) {
    for (const m of phase.modules ?? []) {
      if (m.isPrimaryBridge) return m;
    }
  }
  return outline.phases?.[0]?.modules?.[0];
}

/**
 * Build a module-specific SkillDiffResult by overlaying a target module's
 * spec onto the path's master skillDiff. Used by on-demand module generation.
 * The skill profiles + diff stay the same (they're path-level), but the
 * headline is rewritten to the module's specific bridge.
 */
function specializeSkillDiffForModule(
  master: SkillDiffResult,
  moduleSpec: PathOutlineModule,
): SkillDiffResult {
  // Find a competency in the diff matching the module's skillDomain by name,
  // else synthesize one from the spec so downstream agents have a coherent target.
  const allCompetencies = [
    ...master.diff.gainedKnowledge,
    ...master.diff.gainedSkills,
    ...master.diff.sharedKnowledge,
    ...master.diff.sharedSkills,
  ];
  const matched = allCompetencies.find(
    (c) => c.name.toLowerCase() === moduleSpec.skillDomain.toLowerCase(),
  );
  const primaryBridge =
    matched ??
    {
      elementId: `module.${moduleSpec.number}.${moduleSpec.skillDomain
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`,
      name: moduleSpec.skillDomain || moduleSpec.title,
      importance: 80,
      level: 60,
    };

  // Heuristic: knowledge if it appears in any knowledge array; otherwise skill.
  const inKnowledge = [
    ...master.diff.gainedKnowledge,
    ...master.diff.sharedKnowledge,
  ].some((k) => k.elementId === primaryBridge.elementId);

  return {
    ...master,
    diff: { ...master.diff, primaryBridge: { competency: primaryBridge, type: inKnowledge ? "knowledge" : "skill" } },
    headline: {
      primaryBridge,
      primaryBridgeType: inKnowledge ? "knowledge" : "skill",
      framing: `Module ${moduleSpec.number}: ${moduleSpec.topic}`,
      moduleTopic: moduleSpec.title,
      bloomLevel: moduleSpec.bloomLevel,
      estimatedHours: moduleSpec.estimatedHours,
    },
  };
}

/**
 * On-demand: generate the 8 content agents' output for a SPECIFIC module in
 * a path's outline. Public mutation modules.generateModuleContent schedules
 * this. Same pipeline shape as `run` but skips skillDiff (we already have the
 * master one stored on the path) and inserts the module row keyed to
 * (pathId, moduleNumber).
 */
export const generateForModule = internalAction({
  args: {
    pathId: v.id("paths"),
    moduleNumber: v.number(),
  },
  handler: async (ctx, { pathId, moduleNumber }): Promise<void> => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const path = await ctx.runQuery(internal.paths.getInternal, { pathId });
    if (!path) throw new Error(`Path ${pathId} not found`);

    const outline = (path.pathOutline ?? null) as PathOutline | null;
    if (!outline) throw new Error("Path has no outline; cannot generate module on-demand.");

    let moduleSpec: PathOutlineModule | undefined;
    for (const phase of outline.phases ?? []) {
      const m = phase.modules?.find((m) => m.number === moduleNumber);
      if (m) {
        moduleSpec = m;
        break;
      }
    }
    if (!moduleSpec) {
      throw new Error(`Module ${moduleNumber} not in outline.`);
    }

    // Reconstruct the master skillDiff from the featured module's row (we
    // stored it as careerDiff during the initial run).
    const featured = await ctx.runQuery(internal.modules.getFeaturedInternal, { pathId });
    if (!featured) throw new Error("Featured module not found; cannot specialize.");
    const masterDiff = featured.careerDiff as SkillDiffResult;
    const specialized = specializeSkillDiffForModule(masterDiff, moduleSpec);

    // Pre-create the 7 content agentRuns for THIS module's generation
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

    const lessonPromise = runAgentSettled(ctx, lessonRunId, "lesson", () =>
      withTimeout(
        runLessonAgent(anthropic, specialized, {
          profileText: path.profileText,
          interests: path.interests,
          hoursPerWeek: path.hoursPerWeek,
        }),
        AGENT_TIMEOUT_MS,
        "lesson",
      ),
    );
    const resourcePromise = runAgentSettled(ctx, resourceRunId, "resource", () =>
      withTimeout(runResourceAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "resource"),
    );
    const assessmentPromise = runAgentSettled(ctx, assessmentRunId, "assessment", () =>
      withTimeout(runAssessmentAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "assessment"),
    );
    const coursePromise = runAgentSettled(ctx, courseRunId, "course", () =>
      withTimeout(runCourseAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "course"),
    );
    const communityPromise = runAgentSettled(ctx, communityRunId, "community", () =>
      withTimeout(runCommunityAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "community"),
    );
    const booksPromise = runAgentSettled(ctx, booksRunId, "books", () =>
      withTimeout(runBooksAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "books"),
    );
    const newsPromise = runAgentSettled(ctx, newsRunId, "news", () =>
      withTimeout(runNewsAgent(anthropic, specialized), AGENT_TIMEOUT_MS, "news"),
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

    await ctx.runMutation(internal.modules.insert, {
      pathId,
      moduleNumber,
      isFeatured: false,
      title: moduleSpec.title,
      careerDiff: specialized,
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
  },
});

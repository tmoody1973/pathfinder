/**
 * Resource Agent — Haiku 4.5.
 *
 * Three-step process:
 *   1. Haiku generates 3 YouTube search queries that ANCHOR on the target
 *      career community (UX/UI/web, software, healthcare, etc.) — not just
 *      the bridge competency name. Generic queries like "design fundamentals"
 *      pull game-dev and motion-graphics content that crowds out UX content
 *      on YouTube.
 *   2. searchAndRankVideos runs each query, dedupes by videoId, returns up
 *      to 15 candidates.
 *   3. Haiku scores each candidate 0-100 for relevance to the SPECIFIC career
 *      transition. Anything <60 gets dropped. The remaining are sorted by
 *      relevance score and the top 5 are returned. The 0-100 score replaces
 *      the structural relevance score in the UI.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { searchAndRankVideos, type RankedYouTubeVideo } from "../lib/youtube";
import { parseAgentJson } from "../lib/parseJson";

export interface ResourceResult {
  queries: string[];
  videos: RankedYouTubeVideo[];
}

const QUERY_GEN_SYSTEM_PROMPT = `You generate YouTube search queries for educational content about a specific competency in a CAREER CONTEXT.

Your queries must surface the REAL YouTube corpus of the target career — not merely adjacent content that also contains the word "design" or "tutorial."

CRITICAL RULE: Use TOOL + ARTIFACT vocabulary specific to the target career. Generic words like "design fundamentals" pull game-dev, environment art, and motion-graphics content that crowds out the target field. You must anchor on what practitioners in the target career actually DO in their day-to-day work.

Career-specific good queries (study these patterns):

UX/UI/Product Designer (SOC 15-1255.00):
- "Figma wireframe tutorial beginner"
- "NN Nielsen Norman Group user research methods"
- "Design sprint AJSmart week by week"
- "product design portfolio review senior UX"
- "user interface design hierarchy tutorial figma"
Why good: "Figma", "NN/g", "user research", "design sprint" — only UX content uses these. No game-dev video will ever rank for "Figma wireframe tutorial."

Software Developer (15-1252.00):
- "freeCodeCamp full course JavaScript beginner"
- "React hooks useState tutorial 2025"
- "building REST API Node Express walkthrough"

Graphic Designer (27-1024.00):
- "logo design Illustrator pen tool beginner"
- "typography pairing brand identity"
- "Aaron Draplin logo design process"

Data Scientist (15-2051.00):
- "pandas dataframe tutorial Jupyter"
- "Andrew Ng machine learning specialization review"
- "Kaggle Titanic walkthrough Python"

PATTERN: Real tool name + specific artifact + optional practitioner name.
ANTI-PATTERN: "Design fundamentals", "visual principles tutorial", "career change to X" — too broad, returns wrong-field content.

Additional rules:
- Three queries total, each different angle on the bridge competency
- Don't mention the learner's CURRENT career in queries (YouTube has almost no "UX for radio hosts" content)
- Avoid year stamps like "2024" — they pull content-farm videos
- Avoid "career change to X" phrasing — it pulls vlog/pep-talk content, not tutorials

Return ONLY valid JSON: { "queries": ["query 1", "query 2", "query 3"] }`;

const RELEVANCE_FILTER_SYSTEM_PROMPT = `You score YouTube videos for educational relevance to a specific career transition. BE RUTHLESS.

Scoring scale (0-100):
- 90-100: Directly teaches the target competency in the TARGET CAREER's actual day-to-day work context, using that career's tools and vocabulary
- 75-89: Closely related — same career family, useful background, same work environment
- 50-74: Adjacent FIELD (DIFFERENT career, overlapping vocabulary) — examples below
- 20-49: Weakly related, mostly off-topic
- 0-19: Totally off-topic

CRITICAL — these are DIFFERENT career families, not adjacent:
- UX/UI/Product Design (tools: Figma, Sketch, Adobe XD; artifacts: wireframes, prototypes, user flows, design systems) is a DIFFERENT FAMILY from:
    - Game Design / Game Development (tools: Unity, Unreal, Blender; artifacts: levels, characters, game logic) → score 50 max
    - Environment Art / 3D Art → score 40 max
    - Motion Graphics / After Effects / VFX → score 40 max
    - Graphic Design / Logo Design / Illustration (tools: Illustrator, Photoshop; artifacts: logos, posters, branding) → score 55 max (closer than game, but still a different discipline)
- Software Development / Programming is a DIFFERENT FAMILY from any pure design discipline → score mutual cases 40-55 max
- Data Science is a DIFFERENT FAMILY from general-purpose software tutorials → score 40-60 max

The word "design" appearing in both "UX design" and "game design" and "graphic design" and "motion design" DOES NOT make them the same family. Do not be lenient.

A video titled "20 Game Dev Tips I Wish I Was Told Earlier" — if the target is UX Designer — scores 30. It's a GAME DEV video. It has zero Figma, zero wireframes, zero user research. A UX learner watching it learns nothing applicable.

A video titled "UX Design Fundamentals with Figma" — if the target is UX Designer — scores 90. Right tool, right artifact, right context.

Be willing to score the MAJORITY of candidates under 75. A typical candidate pool has 15 videos with maybe 4-6 that are genuinely on-target. Identify them strictly.

Return ONLY valid JSON: { "scores": [{ "index": 0, "score": 85, "reason": "1 short sentence" }, ...] } — one entry per input video.`;

async function generateQueries(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<string[]> {
  const prompt = `Generate 3 YouTube search queries for educational videos teaching: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType}).

Module topic: ${skillDiff.headline.moduleTopic}
Target career (use this for the anchor term): ${skillDiff.target.title} (SOC ${skillDiff.target.socCode})
Bloom level: ${skillDiff.headline.bloomLevel}

Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: QUERY_GEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseAgentJson<{ queries?: unknown }>(text, "Resource Agent (queries)");

  const queries: string[] = Array.isArray(parsed.queries)
    ? parsed.queries.map((q: unknown) => String(q)).filter((q: string) => q.length > 0).slice(0, 3)
    : [];

  if (queries.length === 0) {
    // Deterministic fallback: anchor on target career title
    queries.push(`${skillDiff.headline.primaryBridge.name} for ${skillDiff.target.title}`);
  }
  return queries;
}

async function filterByRelevance(
  anthropic: Anthropic,
  candidates: RankedYouTubeVideo[],
  skillDiff: SkillDiffResult,
): Promise<RankedYouTubeVideo[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= 3) return candidates; // not enough to filter meaningfully

  try {
    const prompt = `Rate each video for educational relevance to a learner pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}, focused on the bridge competency: ${skillDiff.headline.primaryBridge.name}.

Module topic: ${skillDiff.headline.moduleTopic}

Videos to score (one entry per video, scored 0-100):
${candidates.map((v, i) => `${i}. "${v.title}" by ${v.channelTitle}`).join("\n")}

Return only JSON.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: RELEVANCE_FILTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = parseAgentJson<{
      scores?: Array<{ index?: unknown; score?: unknown }>;
    }>(text, "Resource Agent (filter)");

    if (!Array.isArray(parsed.scores)) return candidates.slice(0, 5);

    // Build a score map by candidate index
    const scoreByIndex = new Map<number, number>();
    for (const s of parsed.scores) {
      const idx = typeof s.index === "number" ? s.index : Number(s.index);
      const score = typeof s.score === "number" ? s.score : Number(s.score);
      if (Number.isInteger(idx) && idx >= 0 && idx < candidates.length && Number.isFinite(score)) {
        scoreByIndex.set(idx, Math.max(0, Math.min(100, score)));
      }
    }

    const scored = candidates.map((video, i) => ({
      video,
      // Replace structural score with relevance score so the UI shows the right number
      score: scoreByIndex.get(i) ?? 0,
    }));

    const relevant = scored.filter((s) => s.score >= 60);

    // Fallback: if nothing scored >= 60, take the top 3 by score so the demo
    // doesn't render an empty section. Better some videos than none.
    const finalList = relevant.length > 0 ? relevant : scored.sort((a, b) => b.score - a.score).slice(0, 3);

    finalList.sort((a, b) => b.score - a.score);
    // Return up to 12 so the UI can render 6 + "Show more" without a refetch
    return finalList.slice(0, 12).map((s) => ({
      ...s.video,
      relevanceScore: s.score, // overwrite with the LLM-judged score
    }));
  } catch (err) {
    console.error("[runResourceAgent] relevance filter failed, falling back to top 12:", err);
    return candidates.slice(0, 12);
  }
}

export async function runResourceAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<ResourceResult> {
  // Step 1: queries
  const queries = await generateQueries(anthropic, skillDiff);

  // Step 2: parallel YouTube searches with dedup
  // count: 8 per query × 3 queries = 24 candidates before dedup, plenty for the
  // relevance filter to surface 12 truly-relevant ones.
  const searchResults = await Promise.allSettled(
    queries.map((q) => searchAndRankVideos(q, { count: 8 })),
  );

  const seen = new Set<string>();
  const merged: RankedYouTubeVideo[] = [];
  for (const result of searchResults) {
    if (result.status !== "fulfilled") continue;
    for (const video of result.value) {
      if (seen.has(video.videoId)) continue;
      seen.add(video.videoId);
      merged.push(video);
    }
  }

  // Step 3: LLM relevance filter (graceful fallback to structural ranking on failure)
  const videos = await filterByRelevance(anthropic, merged, skillDiff);

  return { queries, videos };
}

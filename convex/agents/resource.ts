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

CRITICAL RULES:
1. Every query MUST include a target-career-specific anchor term that distinguishes from adjacent fields:
   - UX/UI/Product Designer → include "UX", "UI", "user interface", "product design", "web design", or "interaction design"
   - Software Developer / Web Developer → include "programming", "software", "web development", or a language name
   - Graphic Designer → include "graphic design", "logo design", or "branding"
   - Game Designer → include "game design", "game dev", "Unity", or "Unreal"
   - Other fields → include the most specific career-community term

   The bridge competency alone (e.g., "Design") is too broad — YouTube will return everything from environment art to logo design. The career anchor disambiguates.

2. Each query should target EDUCATIONAL content (tutorial, course, fundamentals, explainer), not vlogs or commentary.

3. Queries should be DIVERSE — different angles on the bridge. Don't generate near-duplicates.

4. Don't include the learner's CURRENT career in the query (e.g., don't say "UX design for radio hosts"). YouTube has almost none of that. Target the target-career community where good educational content actually exists.

Bad queries (will pull irrelevant results):
- "Design principles tutorial" → pulls game design, environment art, motion graphics
- "Visual design fundamentals" → too generic
- "Career change to UX design" → vlogs and pep talks, not tutorials

Good queries:
- "UX design fundamentals for beginners"
- "Visual hierarchy in user interface design"
- "Typography in product design tutorial"

Return ONLY valid JSON: { "queries": ["query 1", "query 2", "query 3"] }`;

const RELEVANCE_FILTER_SYSTEM_PROMPT = `You score YouTube videos for educational relevance to a specific career transition. Be STRICT. Adjacent fields don't count.

Scoring scale (0-100):
- 90-100: Directly teaches the target competency in the target-career context
- 70-89: Closely related, useful background, same field family
- 40-69: Adjacent field (e.g., game design when learning UX, motion graphics when learning UI) — partially applicable but not on-target
- 0-39: Off-topic, will confuse the learner or waste their time

DISQUALIFY decisively when a video clearly belongs to a different field:
- Target is UX/UI/web design? Score game design, environment art, motion graphics, or pure illustration tutorials BELOW 50.
- Target is software development? Score pure design or visual-tutorial content BELOW 50.
- Target is healthcare or law? Score business/marketing tutorials BELOW 50.

Title alone often tells you. Be willing to score lots of videos under 60.

Return ONLY valid JSON: { "scores": [{ "index": 0, "score": 85, "reason": "1 short sentence" }, ...] } — one entry per input video, in any order.`;

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
    return finalList.slice(0, 5).map((s) => ({
      ...s.video,
      relevanceScore: s.score, // overwrite with the LLM-judged score
    }));
  } catch (err) {
    console.error("[runResourceAgent] relevance filter failed, falling back to top 5:", err);
    return candidates.slice(0, 5);
  }
}

export async function runResourceAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<ResourceResult> {
  // Step 1: queries
  const queries = await generateQueries(anthropic, skillDiff);

  // Step 2: parallel YouTube searches with dedup
  const searchResults = await Promise.allSettled(
    queries.map((q) => searchAndRankVideos(q, { count: 6 })),
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

/**
 * Resource Agent — Haiku 4.5.
 *
 * Two-step process:
 *   1. Haiku generates 3 well-crafted YouTube search queries grounded in the
 *      bridge competency and module topic. Queries are deliberately educational,
 *      not generic. (LLM call)
 *   2. The agent calls searchAndRankVideos for each query, dedupes by videoId,
 *      and returns the top 5 ranked results. (Pure function, no LLM)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { searchAndRankVideos, type RankedYouTubeVideo } from "../lib/youtube";
import { parseAgentJson } from "../lib/parseJson";

export interface ResourceResult {
  queries: string[];
  videos: RankedYouTubeVideo[];
}

const SYSTEM_PROMPT = `You generate YouTube search queries for educational content about a specific competency.

Your queries should:
- Be specific to the COMPETENCY, not the career title
- Favor query phrasing that surfaces tutorial/explainer videos rather than vlogs
- Target intermediate learners (the user is already mid-career, not a beginner at learning)
- Be different enough from each other that they pull complementary results

Return ONLY valid JSON with this shape:
{ "queries": ["query 1", "query 2", "query 3"] }`;

export async function runResourceAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<ResourceResult> {
  // === Step 1: generate queries via Haiku ===
  const prompt = `Generate 3 YouTube search queries for educational videos teaching: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType}).
Module topic: ${skillDiff.headline.moduleTopic}
Audience: a learner pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}.
Bloom level: ${skillDiff.headline.bloomLevel}.

Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseAgentJson<{ queries?: unknown }>(text, "Resource Agent");

  const queries: string[] = Array.isArray(parsed.queries)
    ? parsed.queries.map((q: unknown) => String(q)).filter((q: string) => q.length > 0).slice(0, 3)
    : [];

  if (queries.length === 0) {
    // Fall back to deterministic queries if LLM returned nothing usable
    queries.push(`${skillDiff.headline.primaryBridge.name} for ${skillDiff.target.title}`);
  }

  // === Step 2: search YouTube in parallel for each query, dedupe, rank ===
  const searchResults = await Promise.allSettled(
    queries.map((q) => searchAndRankVideos(q, { count: 5 })),
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

  // Re-rank the merged list and take top 5 across all queries
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return { queries, videos: merged.slice(0, 5) };
}

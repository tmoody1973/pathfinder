/**
 * LLM-powered O*NET occupation lookup fallback for unknown career titles.
 *
 * Convex disallows hyphens in module filenames, so this is `onetFuzzy.ts`
 * (not `onet-fuzzy.ts`). Located at convex/lib/onetFuzzy.ts.
 *
 * Three-layer lookup strategy:
 *  1. Exact substring match (onet.ts → onetLookup)             — fast, free
 *  2. Token-overlap fuzzy match (onet.ts → onetLookup)         — fast, free
 *  3. LLM-powered semantic mapping (THIS FILE)                 — ~1-2s, ~$0.001/call
 *
 * Use case: judge types "TikTok influencer" or "vibe coder" or "VTuber" — careers
 * that aren't in O*NET but have functional equivalents Claude can identify.
 *
 * Output: { socCode, title, reasoning } — pass to the rest of the pipeline as if
 * it were an exact lookup. The reasoning becomes a visible UI note explaining the mapping.
 */

import Anthropic from "@anthropic-ai/sdk";
import { onetLookup, type ONetLookupResult } from "./onet";
import onetData from "../data/onet.json";
import { parseAgentJson } from "./parseJson";

export interface SemanticLookupResult extends ONetLookupResult {
  reasoning: string; // why this mapping was chosen (shown in the UI)
  source: "exact" | "fuzzy" | "llm";
}

/**
 * Build a compact title list once at module load: "27-3011.00 | Broadcast Announcers..."
 * 923 occupations × ~50 chars = ~46KB of context per LLM call. Sonnet/Haiku handle this trivially.
 */
const TITLE_LIST = Object.entries(onetData as Record<string, { title: string }>)
  .map(([socCode, occ]) => `${socCode} | ${occ.title}`)
  .join("\n");

const SYSTEM_PROMPT = `You map free-text career titles to O*NET SOC codes.

You will be given a career query (e.g. "TikTok influencer", "UX designer", "drone pilot")
and a list of all 894 O*NET occupations. Your job is to pick the SINGLE occupation
that most closely matches the FUNCTIONAL work the queried career does.

CRITICAL: Be precise about the difference between adjacent fields. UX/UI design,
product design, graphic design, and software development are DIFFERENT occupations
in O*NET. A "UX Designer" designs user experience and interaction — that's Web
and Digital Interface Designers (15-1255.00), NOT Software Developers (15-1252.00),
even though both work with computers. A "Frontend Developer" who writes code is
Software Developers. A "Product Manager" is not either of those.

Examples of correct mappings:
  - "UX designer"           → 15-1255.00 Web and Digital Interface Designers (designs interaction, NOT writes code)
  - "UI designer"           → 15-1255.00 Web and Digital Interface Designers
  - "Product designer"      → 15-1255.00 Web and Digital Interface Designers
  - "UX researcher"         → 19-3041.00 Sociologists (studies user behavior systematically) OR 15-1255.00
  - "Frontend developer"    → 15-1254.00 Web Developers
  - "Software engineer"     → 15-1252.00 Software Developers
  - "Vibe coder"            → 15-1252.00 Software Developers (writes software, AI-assisted)
  - "Graphic designer"      → 27-1024.00 Graphic Designers (visual identity, NOT digital interaction)
  - "Product manager"       → 11-9111.00 Medical and Health Services Managers — NO, use 11-3021.00 Computer and Information Systems Managers if tech, else 11-2021.00 Marketing Managers
  - "TikTok influencer"     → 27-3031.00 Public Relations Specialists (audience engagement, brand promotion)
  - "Drone pilot"           → 53-2012.00 Commercial Pilots (operates an aircraft for hire)
  - "VTuber"                → 27-2011.00 Actors (performs in character for an audience)
  - "Professional dog walker" → 39-2021.00 Animal Caretakers (cares for animals)

Return ONLY valid JSON with this exact shape:
  { "socCode": "15-1255.00", "reasoning": "one sentence explaining the functional match" }

The reasoning will be shown to a user. Make it crisp, specific, and accurate to
the actual job duties — not the buzzword in the title.

If the query is nonsense or has no plausible match, pick the closest possible
occupation and say it's a loose match in the reasoning.`;

const PROMPT_TEMPLATE = (query: string) =>
  `Career query: "${query}"

O*NET occupations:
${TITLE_LIST}

Return the JSON mapping for this query.`;

/**
 * Three-layer lookup. Tries static (free, instant) before LLM (~1-2s, costs a tiny amount).
 *
 * The Anthropic client should be initialized at module load in your Convex action,
 * passing it in keeps this helper testable and avoids a singleton.
 */
export async function semanticOnetLookup(
  query: string,
  anthropic: Anthropic
): Promise<SemanticLookupResult | null> {
  if (!query || query.trim().length === 0) return null;

  // Layer 1 + 2: try the static lookup first
  const staticResult = onetLookup(query);
  if (staticResult && !staticResult.closestMatch) {
    // exact substring hit — high confidence, no need for LLM
    return {
      ...staticResult,
      reasoning: `"${query}" matched the O*NET title directly.`,
      source: "exact",
    };
  }

  // Layer 3: LLM mapping
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: PROMPT_TEMPLATE(query) }],
    });

    // Extract JSON from the response. Haiku usually returns clean JSON
    // with this prompt, but be defensive about extra prose.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const wrapStatic = (reason: string): SemanticLookupResult | null =>
      staticResult ? { ...staticResult, reasoning: reason, source: "fuzzy" } : null;

    let parsed: { socCode?: unknown; reasoning?: unknown };
    try {
      parsed = parseAgentJson<{ socCode?: unknown; reasoning?: unknown }>(
        text,
        "semanticOnetLookup",
      );
    } catch (err) {
      console.error("[semanticOnetLookup] JSON parse failed:", err);
      return wrapStatic("LLM mapping unavailable — using closest static match.");
    }

    if (typeof parsed.socCode !== "string" || typeof parsed.reasoning !== "string") {
      console.error("[semanticOnetLookup] Malformed JSON:", parsed);
      return wrapStatic("LLM returned malformed mapping — using closest static match.");
    }

    // Validate the SOC code actually exists in our data
    const occ = (onetData as Record<string, { title: string }>)[parsed.socCode];
    if (!occ) {
      console.error("[semanticOnetLookup] LLM returned unknown SOC:", parsed.socCode);
      return wrapStatic("LLM returned unknown occupation code — using closest static match.");
    }

    return {
      socCode: parsed.socCode,
      title: occ.title,
      closestMatch: true,
      reasoning: parsed.reasoning,
      source: "llm",
    };
  } catch (err) {
    console.error("[semanticOnetLookup] LLM call failed:", err);
    // Final fallback: return whatever fuzzy match we got, even if weak
    return staticResult
      ? {
          ...staticResult,
          reasoning: "Best-guess match — LLM mapping unavailable.",
          source: "fuzzy",
        }
      : null;
  }
}

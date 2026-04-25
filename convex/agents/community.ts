/**
 * Community Agent — Haiku 4.5 (with curated-data fast path).
 *
 * Selects communities, people to follow, and newsletters for the Plug In phase
 * (Phase 4). Same dual-path architecture as Course Agent.
 *
 * Curated path: SOC is in curated.json → return curated entries directly.
 * LLM path: SOC isn't curated → Haiku generates plausible recommendations
 * anchored to the format of real curated entries.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { parseAgentJson } from "../lib/parseJson";
import curatedData from "../data/curated.json";

export interface CommunityEntry {
  name: string;
  url: string;
  platform: string;     // Slack | Discord | Reddit | Web | Local meetups | Forum | LinkedIn
  why: string;
}

export interface PersonEntry {
  name: string;
  context: string;      // 1-line on who they are and why follow
  url: string;
}

export interface NewsletterEntry {
  name: string;
  url: string;
  why: string;
}

export interface CommunityResult {
  communities: CommunityEntry[];
  people: PersonEntry[];
  newsletters: NewsletterEntry[];
  source: "curated" | "llm";
  socCode: string;
}

interface CuratedSocEntry {
  title: string;
  moocs: unknown[];
  communities: CommunityEntry[];
  people: PersonEntry[];
  newsletters: NewsletterEntry[];
}

const SYSTEM_PROMPT = `You recommend communities, people to follow, and newsletters for someone pivoting into a target career.

CRITICAL — NEVER HALLUCINATE URLS. If you're not certain a specific community / person profile / newsletter URL exists, use a SAFE PATTERN instead:

Safe URL patterns (always real):
  - Subreddit:       https://www.reddit.com/r/<career-or-topic>/
  - LinkedIn search: https://www.linkedin.com/search/results/people/?keywords=<url-encoded-query>
  - Twitter/X search: https://x.com/search?q=<url-encoded-query>
  - Medium search:   https://medium.com/search?q=<url-encoded-query>
  - Newsletter search via Substack: https://substack.com/search/<query>

Only link directly when you are CERTAIN the specific resource exists. If you're 80% sure a subreddit exists (e.g. r/userexperience, r/programming, r/datascience), you can link directly — those fail gracefully with a 404 page rather than a broken promise.

For people to follow: only name REAL working practitioners / recognized voices you're confident about. Link to their Twitter profile or personal site. If uncertain about their URL, link to a LinkedIn search with their name.

Each "why" / "context" sentence must be SPECIFIC — what does this community teach, who is this person, why follow them. Never generic.

Mix (aim for):
- 4-5 communities (mix platforms: Slack/Discord, Reddit, Web forum, local meetups)
- 4-5 people (working practitioners + recognized voices in the field)
- 2-3 newsletters

Return ONLY valid JSON:
{
  "communities": [
    { "name": "...", "url": "https://... (real or safe-pattern)", "platform": "Slack | Discord | Reddit | Web | Local meetups | Forum", "why": "1 sentence" }
  ],
  "people": [
    { "name": "...", "context": "1 sentence on who they are and why follow", "url": "https://..." }
  ],
  "newsletters": [
    { "name": "...", "url": "https://...", "why": "1 sentence" }
  ]
}`;

export async function runCommunityAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<CommunityResult> {
  const socCode = skillDiff.target.socCode;
  const curatedSoc = (curatedData as { soc?: Record<string, CuratedSocEntry> }).soc ?? {};
  const curated = curatedSoc[socCode];

  // Fast path: SOC is curated
  if (
    curated &&
    Array.isArray(curated.communities) &&
    curated.communities.length > 0
  ) {
    return {
      communities: curated.communities,
      people: curated.people ?? [],
      newsletters: curated.newsletters ?? [],
      source: "curated",
      socCode,
    };
  }

  // Slow path: LLM fallback
  const prompt = `Recommend communities, people, and newsletters for someone pivoting from ${skillDiff.current.title} to ${skillDiff.target.title} (SOC ${socCode}).

Primary bridge competency: ${skillDiff.headline.primaryBridge.name}

Return only JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = parseAgentJson<{
      communities?: unknown[];
      people?: unknown[];
      newsletters?: unknown[];
    }>(text, "Community Agent");

    return {
      communities: Array.isArray(parsed.communities)
        ? parsed.communities.slice(0, 5).map((c: any) => ({
            name: String(c.name ?? ""),
            url: String(c.url ?? ""),
            platform: String(c.platform ?? "Web"),
            why: String(c.why ?? ""),
          }))
        : [],
      people: Array.isArray(parsed.people)
        ? parsed.people.slice(0, 5).map((p: any) => ({
            name: String(p.name ?? ""),
            context: String(p.context ?? ""),
            url: String(p.url ?? ""),
          }))
        : [],
      newsletters: Array.isArray(parsed.newsletters)
        ? parsed.newsletters.slice(0, 3).map((n: any) => ({
            name: String(n.name ?? ""),
            url: String(n.url ?? ""),
            why: String(n.why ?? ""),
          }))
        : [],
      source: "llm",
      socCode,
    };
  } catch (err) {
    console.error("[Community Agent] LLM fallback failed:", err);
    // Last resort: generic fallback from curated.json
    const fallback = (curatedData as { fallback?: CuratedSocEntry }).fallback;
    return {
      communities: fallback?.communities ?? [],
      people: fallback?.people ?? [],
      newsletters: fallback?.newsletters ?? [],
      source: "curated",
      socCode,
    };
  }
}

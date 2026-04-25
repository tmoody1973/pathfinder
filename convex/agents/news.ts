/**
 * News Agent — Perplexity Sonar.
 *
 * Returns 3-5 recent industry news items relevant to the target career.
 * Each item has: title, source, date, url, summary, and a "why this matters
 * for you" explanation tying the news back to the learner's career transition.
 *
 * Why Sonar, not Claude: this is a recency + citations task. Sonar searches
 * the web in real-time and grounds responses in actual URLs. Claude's training
 * cutoff means its "news" would be stale by definition.
 */

import { askSonar } from "../lib/perplexity";
import { parseAgentJson } from "../lib/parseJson";
import type { SkillDiffResult } from "./skillDiff";

export interface NewsItem {
  title: string;
  source: string;       // publication / outlet name
  date: string;         // human-readable date (e.g. "Mar 2026", "Apr 18, 2026")
  url: string;          // real URL from Sonar citations
  summary: string;      // 1-2 sentence description of the news
  whyItMatters: string; // 1-2 sentence tie-in to the learner's career transition
  tag: string;          // single-word category: "Industry Growth" | "Technology" | "Job Market" | "Policy" | "Culture"
}

export interface NewsResult {
  items: NewsItem[];
  citations: string[];  // all source URLs Sonar returned (for debugging / audit)
}

const SYSTEM_PROMPT = `You curate current industry news for career changers on PathFinder.

When given a target career and the bridge competency a learner is developing, return 3-5 current news items from the last 30 days that are genuinely relevant. For each, provide a "why this matters for you" tie-in that connects the news to the learner's transition.

CRITICAL: only use sources from the web results returned to you. Do NOT fabricate titles, dates, or URLs. If you don't have 3 relevant items from the last 30 days, return fewer — never pad.

Tags: pick ONE per item: "Industry Growth" | "Technology" | "Job Market" | "Policy" | "Culture"

Return ONLY valid JSON with this shape (no prose before or after):
{
  "items": [
    {
      "title": "Real headline from a real source",
      "source": "Publication name (e.g. 'Mix Magazine', 'TechCrunch', 'Harvard Business Review')",
      "date": "Human-readable date (e.g. 'Apr 2026' or 'Apr 18, 2026')",
      "url": "Full URL from the web search — do not fabricate",
      "summary": "1-2 sentence description of what the news is",
      "whyItMatters": "1-2 sentence tie-in — why this matters specifically for someone pivoting INTO the target career (reference the bridge competency when appropriate)",
      "tag": "Industry Growth"
    }
  ]
}`;

export async function runNewsAgent(skillDiff: SkillDiffResult): Promise<NewsResult> {
  const prompt = `Find 3-5 current industry news items (last 30 days) relevant to someone pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}.

Bridge competency being developed: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType})
Module topic: ${skillDiff.headline.moduleTopic}

Focus your search on: industry growth, new technology, job market trends, regulatory changes, or cultural shifts in the ${skillDiff.target.title} field. Avoid generic "productivity" or "AI-is-everywhere" listicles.

For each item include a "why this matters for you" sentence that ties the news back to the learner's career transition and/or the bridge competency they're developing.

Return only JSON per the schema.`;

  const sonarResponse = await askSonar(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    {
      model: "sonar",
      maxTokens: 1800,
      searchRecency: "month",
    },
  );

  const parsed = parseAgentJson<{ items?: unknown[] }>(sonarResponse.content, "News Agent");

  const items: NewsItem[] = Array.isArray(parsed.items)
    ? parsed.items
        .map((raw: any) => ({
          title: String(raw?.title ?? ""),
          source: String(raw?.source ?? ""),
          date: String(raw?.date ?? ""),
          url: String(raw?.url ?? ""),
          summary: String(raw?.summary ?? ""),
          whyItMatters: String(raw?.whyItMatters ?? ""),
          tag: normalizeTag(String(raw?.tag ?? "")),
        }))
        .filter((item) => item.title.length > 0 && item.url.length > 0)
        .slice(0, 5)
    : [];

  return { items, citations: sonarResponse.citations };
}

function normalizeTag(raw: string): string {
  const allowed = ["Industry Growth", "Technology", "Job Market", "Policy", "Culture"];
  const match = allowed.find((t) => t.toLowerCase() === raw.toLowerCase());
  return match ?? "Industry Growth";
}

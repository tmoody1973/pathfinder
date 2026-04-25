/**
 * News Agent — two-step: Perplexity /search then Haiku tie-in synthesis.
 *
 * Step 1: Query Perplexity /search with recency filter (last month) for news
 *   relevant to the target career. Returns REAL ranked web results — titles,
 *   URLs, snippets, dates. Zero hallucination risk: these are actual pages.
 *
 * Step 2: Haiku 4.5 takes the real results and adds the editorial layer:
 *   - Selects 3-5 most relevant items
 *   - Writes a 1-2 sentence summary based on the real snippet
 *   - Writes a "why this matters for you" tie-in to the learner's transition
 *   - Categorizes with a tag
 *
 * This pattern gives us guaranteed-real URLs AND career-contextualized framing.
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchWeb, type SearchResult } from "../lib/perplexity";
import { parseAgentJson } from "../lib/parseJson";
import type { SkillDiffResult } from "./skillDiff";

export interface NewsItem {
  title: string;
  source: string;       // derived from the URL host or Haiku's reading of the result
  date: string;         // from search metadata or Haiku's normalization
  url: string;          // guaranteed real from Perplexity /search
  summary: string;      // 1-2 sentence description written by Haiku
  whyItMatters: string; // 1-2 sentence tie-in written by Haiku
  tag: string;          // category: Industry Growth | Technology | Job Market | Policy | Culture
}

export interface NewsResult {
  items: NewsItem[];
  searchQuery: string;      // the query sent to Perplexity
  candidateCount: number;   // how many real results /search returned
}

const SYSTEM_PROMPT = `You curate and contextualize industry news for career changers on PathFinder.

You will receive a list of REAL web search results (title, URL, snippet, date) and a career-transition context. Your job: pick the 3-5 MOST relevant items and for each one:
- Write a 1-2 sentence SUMMARY based strictly on the snippet (do not invent details)
- Write a 1-2 sentence WHY IT MATTERS tie-in connecting the news to the learner's specific career transition and the bridge competency they're developing
- Pick ONE tag from: "Industry Growth" | "Technology" | "Job Market" | "Policy" | "Culture"
- Echo the title, url, and a derived source name (from the URL host, e.g. "techcrunch.com" → "TechCrunch")

CRITICAL: Use only the real URLs from the search results. Do NOT invent titles, dates, or URLs. If fewer than 3 are relevant, return fewer — never pad.

Return ONLY valid JSON:
{
  "items": [
    {
      "resultIndex": 0,                 // index into the results array you were given
      "source": "Publication name derived from URL host (e.g. 'The Verge', 'TechCrunch')",
      "summary": "1-2 sentences based on the snippet — no invented details",
      "whyItMatters": "1-2 sentences tying to the learner's career transition + bridge",
      "tag": "Industry Growth"
    }
  ]
}`;

/** Extract a reasonable source name from a URL host. techcrunch.com → TechCrunch. */
function derivePublication(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    // Capitalize + preserve internal caps for known publications
    const known: Record<string, string> = {
      techcrunch: "TechCrunch",
      theverge: "The Verge",
      wired: "WIRED",
      nytimes: "The New York Times",
      wsj: "The Wall Street Journal",
      bloomberg: "Bloomberg",
      forbes: "Forbes",
      hbr: "Harvard Business Review",
      mitsloan: "MIT Sloan Management Review",
      smashingmagazine: "Smashing Magazine",
      nngroup: "Nielsen Norman Group",
      fastcompany: "Fast Company",
      cnbc: "CNBC",
      reuters: "Reuters",
      axios: "Axios",
    };
    return known[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Web";
  }
}

export async function runNewsAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<NewsResult> {
  // Step 1: real web search for recent items. /search doesn't support a recency
  // filter parameter (only /chat/completions does), so include the current year
  // in the query string to bias toward recent articles.
  const currentYear = new Date().getFullYear();
  const query = `${skillDiff.target.title} industry news trends ${currentYear}`;
  const candidates = await searchWeb(query, { maxResults: 10 });

  if (candidates.length === 0) {
    return { items: [], searchQuery: query, candidateCount: 0 };
  }

  // Step 2: Haiku tie-in synthesis over real results
  const resultsForPrompt = candidates
    .map(
      (r, i) =>
        `[${i}] title: "${r.title}"
    url:     ${r.url}
    date:    ${r.date ?? "unknown"}
    snippet: ${r.snippet?.slice(0, 400) ?? "(no snippet)"}`,
    )
    .join("\n\n");

  const userPrompt = `Learner transition: ${skillDiff.current.title} → ${skillDiff.target.title}
Bridge competency: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType})

Search results (pick the 3-5 most relevant, drop the rest):

${resultsForPrompt}

Return only JSON per the schema.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseAgentJson<{ items?: unknown[] }>(text, "News Agent");

  const items: NewsItem[] = Array.isArray(parsed.items)
    ? parsed.items
        .map((raw: any): NewsItem | null => {
          const idx = Number.isInteger(raw?.resultIndex) ? raw.resultIndex : -1;
          const source = candidates[idx];
          if (!source) return null;
          return {
            title: source.title,
            url: source.url,
            date: source.date ?? String(raw?.date ?? ""),
            source: String(raw?.source ?? derivePublication(source.url)),
            summary: String(raw?.summary ?? source.snippet ?? ""),
            whyItMatters: String(raw?.whyItMatters ?? ""),
            tag: normalizeTag(String(raw?.tag ?? "")),
          };
        })
        .filter((item): item is NewsItem => item !== null)
        .slice(0, 5)
    : [];

  return { items, searchQuery: query, candidateCount: candidates.length };
}

function normalizeTag(raw: string): string {
  const allowed = ["Industry Growth", "Technology", "Job Market", "Policy", "Culture"];
  const match = allowed.find((t) => t.toLowerCase() === raw.toLowerCase());
  return match ?? "Industry Growth";
}

/**
 * Books Agent — Haiku 4.5 + Google Books API.
 *
 * Two-step:
 *   1. Haiku generates 2-3 book search queries anchored to target career +
 *      bridge competency. (Same career-anchoring rules as Resource Agent —
 *      generic queries pull wrong-field books; career-anchored queries pull
 *      the real canon of the field.)
 *   2. Google Books API search per query. Dedup, rank by a simple quality
 *      signal (ratings count + rating), return top 5.
 *
 * Google Books is keyless and free (1000 req/day). No cost to the demo.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { searchBooks, type BookResult } from "../lib/googleBooks";
import { parseAgentJson } from "../lib/parseJson";

export interface BooksResult {
  queries: string[];
  books: BookResult[];
}

const SYSTEM_PROMPT = `You generate Google Books search queries for the canonical and foundational books in a specific career field.

CRITICAL RULES:
1. Every query MUST anchor on the TARGET CAREER field — not the bridge competency alone. The canonical books for "design" are different from the canonical books for "UX design" or "graphic design" or "industrial design." Be specific.
2. Prefer queries that surface RESPECTED foundational texts practitioners in the target career actually recommend to newcomers. Examples of anchor terms:
   - For UX Designer: "UX design", "user experience design", "interaction design", "service design"
   - For Software Developer: "software engineering", "programming", "web development", or a specific language
   - For Graphic Designer: "graphic design", "typography", "branding"
   - For Data Scientist: "data science", "machine learning", "statistics"
3. One query should favor FOUNDATIONAL / CANON titles ("design of everyday things" style — books the field defines itself by).
4. One query should favor PRACTICAL / CRAFT titles (how to do the work well).
5. One query may target a specific ADJACENT competency that supports the bridge.

Bad queries:
- "design books" → too broad, pulls interior design and craft books
- "UX design 2024" → date-stamp noise pulls low-quality content farms
- "career change to UX" → self-help pop-psych, not the actual books

Good queries:
- "UX design fundamentals" → surfaces Don Norman, Krug, etc.
- "interaction design principles" → surfaces Cooper, Saffer, Buxton
- "design research methods user" → surfaces Portigal, Travis, etc.

Return ONLY valid JSON: { "queries": ["query 1", "query 2", "query 3"] }`;

async function generateQueries(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<string[]> {
  const prompt = `Generate 3 Google Books queries for the canonical books in the target career's field.

Primary bridge competency: ${skillDiff.headline.primaryBridge.name}
Target career: ${skillDiff.target.title} (SOC ${skillDiff.target.socCode})
Module topic: ${skillDiff.headline.moduleTopic}

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
  const parsed = parseAgentJson<{ queries?: unknown }>(text, "Books Agent (queries)");

  const queries: string[] = Array.isArray(parsed.queries)
    ? parsed.queries.map((q: unknown) => String(q)).filter((q: string) => q.length > 0).slice(0, 3)
    : [];
  if (queries.length === 0) {
    queries.push(`${skillDiff.target.title} ${skillDiff.headline.primaryBridge.name} fundamentals`);
  }
  return queries;
}

/**
 * Rank books by a simple quality heuristic:
 *   - Ratings count matters (signal of reach)
 *   - Average rating matters (signal of quality)
 *   - Combined: score = ratingsCount * averageRating (books with >100 ratings
 *     and >4.0 rating rise to top; books with 0 ratings fall to bottom)
 */
function scoreBook(book: BookResult): number {
  const rating = book.averageRating ?? 0;
  const count = book.ratingsCount ?? 0;
  return count * rating;
}

export async function runBooksAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<BooksResult> {
  const queries = await generateQueries(anthropic, skillDiff);

  const results = await Promise.allSettled(
    queries.map((q) => searchBooks(q, 8)),
  );

  const seen = new Set<string>();
  const merged: BookResult[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const book of r.value) {
      // De-dup on Google Books id; also skip books with no thumbnail (they're
      // almost always placeholder/encyclopedia entries, not real titles)
      if (seen.has(book.id)) continue;
      if (!book.thumbnailUrl) continue;
      seen.add(book.id);
      merged.push(book);
    }
  }

  merged.sort((a, b) => scoreBook(b) - scoreBook(a));

  return { queries, books: merged.slice(0, 5) };
}

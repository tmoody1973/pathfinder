/**
 * Books Agent — Haiku 4.5 + Google Books API.
 *
 * Three-step:
 *   1. Haiku generates 3 book search queries. EVERY query MUST contain the
 *      literal target career name as an anchor — Google Books has no curation,
 *      so generic queries pull DevOps, generic management, and academic
 *      textbooks that happen to share keywords with product/UX/data fields.
 *   2. Google Books API search per query. Dedup, drop entries without
 *      thumbnails (usually placeholder/encyclopedia stubs).
 *   3. Haiku scores each candidate 0-100 for relevance to the SPECIFIC career.
 *      Anything <60 gets dropped. Survivors are sorted by relevance desc, with
 *      ratingsCount * averageRating as a tiebreaker. Top 12 returned so the UI
 *      can show 5 + "Show more" without a second API call.
 *
 * Google Books is keyless and free (1000 req/day). No cost to the demo.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { searchBooks, type BookResult } from "../lib/googleBooks";
import { parseAgentJson } from "../lib/parseJson";

export interface RankedBookResult extends BookResult {
  relevanceScore: number; // 0-100, LLM-judged
}

export interface BooksResult {
  queries: string[];
  books: RankedBookResult[];
}

const QUERY_GEN_SYSTEM_PROMPT = `You generate Google Books search queries for the canonical and foundational books in a SPECIFIC career field.

NON-NEGOTIABLE RULE: Every query MUST contain the literal target career name (or a tightly equivalent phrase). Google Books indexes ALL books — including DevOps texts, generic management textbooks, academic encyclopedias — and returns whatever matches the most keywords. A query like "agile delivery" returns Continuous Delivery (DevOps) before it returns Inspired (PM). A query like "management fundamentals" returns generic business textbooks. You must anchor.

Career-specific good queries (study these patterns):

Product Manager / Product Development (SOC 11-3021.00):
- "product management Marty Cagan"
- "product strategy Melissa Perri"
- "user research product manager"
Why good: Anchor on practitioner names and the literal phrase "product manager" / "product management". Surfaces Inspired, EMPOWERED, Escaping the Build Trap, Continuous Discovery Habits — the actual canon.

UX/UI/Product Designer (SOC 15-1255.00):
- "user experience design Don Norman"
- "interaction design Cooper Saffer"
- "design research Portigal user research"
Why good: Practitioner names + literal "user experience" or "interaction design". Surfaces Design of Everyday Things, About Face, Interviewing Users.

Software Engineer (SOC 15-1252.00):
- "software engineering Martin Fowler"
- "clean code Robert Martin programming"
- "pragmatic programmer Hunt Thomas"

Data Scientist (SOC 15-2051.00):
- "data science Hadley Wickham"
- "machine learning Andrew Ng practical"
- "statistical learning Hastie Tibshirani"

Graphic Designer (SOC 27-1024.00):
- "graphic design Paul Rand"
- "typography Robert Bringhurst"
- "logo design process Aaron Draplin"

ANTI-PATTERNS (do not produce queries like these):
- "leadership fundamentals" → returns generic management textbooks
- "agile delivery" → returns DevOps and Continuous Delivery
- "career change to product manager" → returns self-help, not canonical books
- "design books" → returns interior design, fashion, craft
- "systems integration" → returns IT/sysadmin textbooks
- A query without the target career name in it

Three queries total. Each different angle: foundational canon, practical craft, adjacent supporting competency. ALL three must contain the target career name or a tight synonym ("product management" / "product manager" / "product development" are tight synonyms; "leadership" / "delivery" / "systems" are NOT).

Return ONLY valid JSON: { "queries": ["query 1", "query 2", "query 3"] }`;

const RELEVANCE_FILTER_SYSTEM_PROMPT = `You score books for educational relevance to a specific career transition. BE RUTHLESS.

Scoring scale (0-100):
- 90-100: Canonical / foundational text in the TARGET CAREER's field. Practitioners recommend it to newcomers. Title and subtitle clearly signal the target field.
- 75-89: Closely related — practical craft text in the same career family.
- 50-74: Adjacent FIELD with overlapping vocabulary (different career family — see below).
- 20-49: Weakly related, mostly off-topic. Generic management textbook for a PM target. DevOps text for a UX target. Academic encyclopedia.
- 0-19: Totally off-topic.

CRITICAL — these are DIFFERENT career families:
- Product Management / Product Development (canon: Inspired by Cagan, Escaping the Build Trap by Perri, Continuous Discovery Habits by Torres) is a DIFFERENT FAMILY from:
    - DevOps / Continuous Delivery / SRE → score 35 max for a PM target
    - Generic Management / Leadership / Business Fundamentals (Drucker generic, Lussier textbooks) → score 30 max for a PM target — these books are for MBA students, not PMs
    - Project Management (PMP-style) → score 50 max — adjacent but different role
    - Software Engineering → score 45 max — PMs work WITH engineers, they aren't engineers

- UX / Product Design (canon: Norman, Krug, Cooper) is DIFFERENT FAMILY from:
    - Game Design → score 40 max
    - Graphic Design / Visual Design → score 50 max
    - Industrial Design / Product Design (physical) → score 45 max

- Software Engineering / Programming is DIFFERENT FAMILY from:
    - DevOps / SRE → score 60 (closer than other splits)
    - Pure Computer Science theory → score 50 max for a working-engineer target
    - Data Science → score 55 max

The word "design" appearing in both "UX design" and "graphic design" and "system design" does NOT make them the same family.
The word "management" appearing in both "product management" and "general management" does NOT make them the same family.

Be willing to score the MAJORITY of candidates under 60. A typical Google Books candidate pool of 20 books for a PM target has maybe 4-6 that are genuinely on target. Identify them strictly.

A book titled "Continuous Delivery 2.0: Business-leading DevOps Essentials" — if the target is Product Manager — scores 30. It's a DevOps book. A PM doesn't read DevOps books to learn product management. They read Inspired.

A book titled "Inspired: How to Create Tech Products Customers Love" — if the target is Product Manager — scores 95. Right field, right canon, written by Marty Cagan.

Return ONLY valid JSON: { "scores": [{ "index": 0, "score": 85, "reason": "1 short sentence" }, ...] } — one entry per input book.`;

async function generateQueries(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<string[]> {
  const prompt = `Generate 3 Google Books queries for the canonical books in the target career's field.

Target career (this name MUST appear in every query): ${skillDiff.target.title} (SOC ${skillDiff.target.socCode})
Primary bridge competency (use to choose query angle, not as anchor): ${skillDiff.headline.primaryBridge.name}
Module topic: ${skillDiff.headline.moduleTopic}

Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: QUERY_GEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseAgentJson<{ queries?: unknown }>(text, "Books Agent (queries)");

  const queries: string[] = Array.isArray(parsed.queries)
    ? parsed.queries
        .map((q: unknown) => String(q))
        .filter((q: string) => q.length > 0)
        .slice(0, 3)
    : [];
  if (queries.length === 0) {
    queries.push(`${skillDiff.target.title} fundamentals canonical`);
  }
  return queries;
}

async function filterByRelevance(
  anthropic: Anthropic,
  candidates: BookResult[],
  skillDiff: SkillDiffResult,
): Promise<RankedBookResult[]> {
  if (candidates.length === 0) return [];
  // With <=4 candidates, ranking adds noise. Just return them with a default score.
  if (candidates.length <= 4) {
    return candidates.map((b) => ({ ...b, relevanceScore: 70 }));
  }

  try {
    const prompt = `Rate each book for educational relevance to a learner pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}, focused on: ${skillDiff.headline.primaryBridge.name}.

Module topic: ${skillDiff.headline.moduleTopic}

Books to score (one entry per book, 0-100):
${candidates
  .map((b, i) => {
    const subtitle = b.subtitle ? ` — ${b.subtitle}` : "";
    const authors = b.authors.length > 0 ? ` by ${b.authors.slice(0, 2).join(", ")}` : "";
    return `${i}. "${b.title}${subtitle}"${authors}`;
  })
  .join("\n")}

Return only JSON.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      system: RELEVANCE_FILTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = parseAgentJson<{
      scores?: Array<{ index?: unknown; score?: unknown }>;
    }>(text, "Books Agent (filter)");

    if (!Array.isArray(parsed.scores)) {
      // Fallback: keep ranking by popularity if filter parse fails
      return candidates.map((b) => ({ ...b, relevanceScore: 50 }));
    }

    const scoreByIndex = new Map<number, number>();
    for (const s of parsed.scores) {
      const idx = typeof s.index === "number" ? s.index : Number(s.index);
      const score = typeof s.score === "number" ? s.score : Number(s.score);
      if (Number.isInteger(idx) && idx >= 0 && idx < candidates.length && Number.isFinite(score)) {
        scoreByIndex.set(idx, Math.max(0, Math.min(100, score)));
      }
    }

    const scored: RankedBookResult[] = candidates.map((b, i) => ({
      ...b,
      relevanceScore: scoreByIndex.get(i) ?? 0,
    }));

    // Drop low-relevance entries; if cutoff leaves us empty (rare), keep top 5 by score
    const relevant = scored.filter((b) => b.relevanceScore >= 60);
    const finalList =
      relevant.length > 0
        ? relevant
        : scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);

    // Sort: relevance desc, then by popularity (ratingsCount * rating) as tiebreaker
    finalList.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      const aPop = (a.ratingsCount ?? 0) * (a.averageRating ?? 0);
      const bPop = (b.ratingsCount ?? 0) * (b.averageRating ?? 0);
      return bPop - aPop;
    });

    return finalList.slice(0, 12);
  } catch (err) {
    console.error("[runBooksAgent] relevance filter failed, falling back to popularity:", err);
    // Fallback: sort by popularity, return top 12 with neutral relevance score
    return candidates
      .slice()
      .sort((a, b) => {
        const aPop = (a.ratingsCount ?? 0) * (a.averageRating ?? 0);
        const bPop = (b.ratingsCount ?? 0) * (b.averageRating ?? 0);
        return bPop - aPop;
      })
      .slice(0, 12)
      .map((b) => ({ ...b, relevanceScore: 50 }));
  }
}

export async function runBooksAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<BooksResult> {
  const queries = await generateQueries(anthropic, skillDiff);

  const results = await Promise.allSettled(queries.map((q) => searchBooks(q, 10)));

  const seen = new Set<string>();
  const merged: BookResult[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const book of r.value) {
      // De-dup on Google Books id; skip books with no thumbnail
      // (usually placeholder/encyclopedia entries, not real titles)
      if (seen.has(book.id)) continue;
      if (!book.thumbnailUrl) continue;
      seen.add(book.id);
      merged.push(book);
    }
  }

  const books = await filterByRelevance(anthropic, merged, skillDiff);

  return { queries, books };
}

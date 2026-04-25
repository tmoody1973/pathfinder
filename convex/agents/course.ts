/**
 * Course Agent — Haiku 4.5 (with curated-data fast path).
 *
 * Selects 1-3 free MOOCs for the Foundations phase (Phase 2).
 *
 * Strategy:
 *   1. Look up the target career's SOC in curated.json. If present, return
 *      its curated MOOCs directly — no LLM call needed.
 *   2. If SOC isn't curated, fall back to Haiku: it gets the curated-set
 *      MOOC catalog as a reference and generates plausible MOOC suggestions
 *      for the target career, anchored to known platforms (Coursera, edX,
 *      MIT OCW, freeCodeCamp, Khan Academy, HubSpot Academy, etc.).
 *
 * The curated path is faster, cheaper, and more reliable. The LLM fallback
 * keeps the demo working for any career a judge inputs.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { parseAgentJson } from "../lib/parseJson";
import curatedData from "../data/curated.json";

export interface MoocEntry {
  title: string;
  provider: string;       // e.g. "Coursera (free audit) — Stanford"
  url: string;
  duration: string;       // e.g. "6 months at 10 hr/week"
  level: string;          // Beginner | Intermediate | Advanced | Varies
  why: string;            // 1-line case for why this fits
}

export interface CourseResult {
  moocs: MoocEntry[];
  source: "curated" | "llm";
  socCode: string;
}

interface CuratedSocEntry {
  title: string;
  moocs: MoocEntry[];
  communities: unknown[];
  people: unknown[];
  newsletters: unknown[];
}

const SYSTEM_PROMPT = `You recommend 2-3 FREE online courses for a learner pivoting into a target career.

CRITICAL — NEVER HALLUCINATE SPECIFIC COURSE URLS. If you're not 100% certain a specific course exists at a specific URL, DO NOT guess a URL. Instead return a PLATFORM SEARCH URL using the exact patterns below:

SAFE SEARCH URL patterns (always real, always work):
  - Coursera search:  https://www.coursera.org/search?query=<url-encoded-query>
  - edX search:       https://www.edx.org/search?q=<url-encoded-query>
  - MIT OCW search:   https://ocw.mit.edu/search/?q=<url-encoded-query>
  - Khan Academy:     https://www.khanacademy.org/search?search_again=1&page_search_query=<url-encoded-query>
  - freeCodeCamp:     https://www.freecodecamp.org/learn (single catalog URL — always same)
  - HubSpot Academy:  https://academy.hubspot.com/courses

Only provide a specific course URL when you are CERTAIN it exists. Examples you can reference by specific URL with high confidence:
  - "Google UX Design Professional Certificate" → https://www.coursera.org/professional-certificates/google-ux-design
  - "Google Project Management Professional Certificate" → https://www.coursera.org/professional-certificates/google-project-management
  - "Google Digital Marketing & E-commerce Certificate" → https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce
  - "IBM Data Science Professional Certificate" → https://www.coursera.org/professional-certificates/ibm-data-science
  - "Meta Front-End Developer Professional Certificate" → https://www.coursera.org/professional-certificates/meta-front-end-developer
  - "CS50: Introduction to Computer Science" → https://www.edx.org/course/introduction-computer-science-harvardx-cs50x
  - "freeCodeCamp Full-Stack Curriculum" → https://www.freecodecamp.org/learn
  - "Fast.ai Practical Deep Learning" → https://course.fast.ai/

For ANYTHING ELSE, produce a search URL. Title the entry "<Provider>: search for <topic>" and link to the platform search URL with the relevant query.

Tone: each "why" sentence is direct, specific, and tells the learner what they'll get.

Return ONLY valid JSON:
{
  "moocs": [
    {
      "title": "Real course title OR '<Provider>: search for <topic>' if uncertain",
      "provider": "Provider — explicit free pathway",
      "url": "https://... — must be a real, verifiable URL (specific course OR platform search)",
      "duration": "e.g. 6 weeks at 4 hr/week OR 'Self-paced' for search results",
      "level": "Beginner | Intermediate | Advanced | Varies",
      "why": "One sentence on why it fits this career change."
    }
  ]
}`;

export async function runCourseAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<CourseResult> {
  const socCode = skillDiff.target.socCode;
  const curatedSoc = (curatedData as { soc?: Record<string, CuratedSocEntry> }).soc ?? {};
  const curated = curatedSoc[socCode];

  // Fast path: SOC is in our curated set
  if (curated && Array.isArray(curated.moocs) && curated.moocs.length > 0) {
    return {
      moocs: curated.moocs.slice(0, 3),
      source: "curated",
      socCode,
    };
  }

  // Slow path: LLM fallback for non-curated SOCs
  const referenceMoocs = Object.values(curatedSoc)
    .flatMap((entry) => entry.moocs.map((m) => `${m.title} (${m.provider})`))
    .slice(0, 12)
    .join("\n");

  const prompt = `Recommend 2-3 free MOOCs for someone pivoting from ${skillDiff.current.title} to ${skillDiff.target.title} (SOC ${socCode}).

Primary bridge competency: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType})
Module topic: ${skillDiff.headline.moduleTopic}

For reference, here are real free MOOCs we already curate for other careers — match their format and quality bar:
${referenceMoocs}

Return only JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = parseAgentJson<{ moocs?: unknown[] }>(text, "Course Agent");

    if (!Array.isArray(parsed.moocs) || parsed.moocs.length === 0) {
      throw new Error("Course Agent: empty or malformed moocs array");
    }

    const moocs: MoocEntry[] = parsed.moocs.slice(0, 3).map((m: any) => ({
      title: String(m.title ?? ""),
      provider: String(m.provider ?? ""),
      url: String(m.url ?? ""),
      duration: String(m.duration ?? "Self-paced"),
      level: String(m.level ?? "Varies"),
      why: String(m.why ?? ""),
    }));

    return { moocs, source: "llm", socCode };
  } catch (err) {
    console.error("[Course Agent] LLM fallback failed, returning generic catalog links:", err);
    // Last-resort fallback: return the static fallback entries
    const fallbackMoocs = (curatedData as { fallback?: { moocs?: MoocEntry[] } }).fallback?.moocs ?? [];
    return { moocs: fallbackMoocs.slice(0, 3), source: "curated", socCode };
  }
}

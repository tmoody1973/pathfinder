/**
 * Description Agent — Sonnet 4.6.
 *
 * Generates the "About this career" reference content: what the role IS in
 * lived terms, not what a competency profile lists. Day-in-the-life, tools,
 * career ladder, trade-offs, entry pathways, adjacent careers, who you work with.
 *
 * Model: Haiku 4.5. Was Sonnet 4.6 originally for prose quality, but Sonnet
 * generates ~30-50 tokens/sec, and this 1500-2500-token structured JSON
 * routinely tipped over the 60s timeout under load. Haiku 4.5 generates
 * 80-150 tokens/sec, completes in 15-25s, never times out. The quality
 * delta on structured fact retrieval (tools, comp ranges, ladder rungs) is
 * smaller than the delta on judgment-heavy tasks like the counselor. The
 * tightened system-prompt rules below carry most of the prose-quality load.
 *
 * The content is general to the TARGET CAREER — not the bridge or the user's
 * current role. That means it can be cached per (targetCareer, socCode) tuple
 * across users in v2. For now, regenerated per path.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { parseAgentJson } from "../lib/parseJson";

export interface DescriptionTool {
  name: string;
  purpose: string;
}

export interface DescriptionLadderRung {
  title: string;
  yearsExperience: string;
  compRange: string;
  whatChanges: string;
}

export interface DescriptionEntryPathway {
  pathway: string;
  proportion: string;
  notes: string;
}

export interface DescriptionAdjacentCareer {
  title: string;
  movePattern: string;
}

export interface DescriptionCollaborator {
  role: string;
  relationship: string;
}

export interface DescriptionResult {
  /** Plain-English one-sentence "what this role IS." Read first by every user. */
  oneLineDefinition: string;
  /** Day in the life — three buckets so the page can present a narrative arc */
  dayInTheLife: {
    morning: string;
    afternoon: string;
    eveningOrEdge: string;
  };
  /** Real tools by name. 5-10 items typical. */
  toolsAndArtifacts: DescriptionTool[];
  /** 4-6 rungs from junior to staff/principal. Comp ranges are US ranges in 2026 dollars. */
  ladder: DescriptionLadderRung[];
  /** 3-5 honest pros, 3-5 honest cons. No cheerleading. */
  tradeoffs: { pros: string[]; cons: string[] };
  /** How people actually break in. Mix of bootcamp, self-taught, lateral, formal degree. */
  entryPathways: DescriptionEntryPathway[];
  /** What this role can become in 5+ years */
  adjacentCareers: DescriptionAdjacentCareer[];
  /** Who you sit in meetings with day-to-day */
  whoYouWorkWith: DescriptionCollaborator[];
}

const SYSTEM_PROMPT = `You write rich, specific reference descriptions of careers for PathFinder. Your output is the single most-read content on the path page — career changers come back to it across the whole learning experience to ground themselves.

VOICE: A senior practitioner in this exact career, writing for a curious, skeptical career-change candidate. Direct, specific, occasionally dry. Never cheerleading. Never generic.

NON-NEGOTIABLE QUALITY RULES:
1. SPECIFICITY OVER ABSTRACTION. "PMs use Linear, Figma, Amplitude, and SQL" beats "PMs use various tools." "9am standup → 30 min Figma review with design → spec writing in Notion" beats "PMs collaborate with teams." Real names, real artifacts, real cadence.
2. VOCABULARY OF THE ACTUAL CAREER. Use the words practitioners use among themselves. Don't translate down.
3. NO PADDING. If you'd rather skip a section than fabricate detail, return fewer items. 3 honest entry pathways beat 6 invented ones.
4. ROUND COMPENSATION HONESTLY. US 2026 ranges. State as ranges, not single points. Markets vary; acknowledge that. Format: "$X-Y/yr". Use base + total comp where typical (e.g. "$160-220K base, $220-320K total at FAANG").
5. TRADE-OFFS MUST BE HONEST. Career-change content is full of glossy "you'll love it!" cons that read as marketing. Real cons are: politics in PM, on-call rotations in DevOps, client-pleasing in agency design, plateau pay for senior ICs vs managers. Name them.
6. ENTRY PATHWAYS USE PROPORTIONS YOU CAN DEFEND. "About a third of new PMs come from product marketing or analyst roles." If you don't know, say "common" / "rare" / "increasingly common", not made-up percentages.

LENGTH BUDGET (NON-NEGOTIABLE): output must fit within 800 tokens. Be terse. Single short sentence per item where the schema allows. Skip optional fields if they would push you over budget. The user reads this AT A GLANCE.

OUTPUT FORMAT — return ONLY a JSON object, no prose, no markdown:
{
  "oneLineDefinition": "<ONE short sentence; what this role IS>",
  "dayInTheLife": {
    "morning": "<2 short sentences; real tools named, real cadence>",
    "afternoon": "<2 short sentences; what shifts>",
    "eveningOrEdge": "<1 sentence; weekly arc or edge>"
  },
  "toolsAndArtifacts": [
    { "name": "<tool name>", "purpose": "<5-8 words>" },
    ...EXACTLY 4 entries...
  ],
  "ladder": [
    { "title": "<e.g. Associate PM>", "yearsExperience": "<e.g. 0-2 yrs>", "compRange": "<e.g. $90-130K>", "whatChanges": "<short>" },
    ...EXACTLY 3 rungs from entry to senior...
  ],
  "tradeoffs": {
    "pros": ["<3 short pros>"],
    "cons": ["<3 short cons>"]
  },
  "entryPathways": [
    { "pathway": "<e.g. Lateral from analyst>", "proportion": "<e.g. common>", "notes": "<short>" },
    ...EXACTLY 2 pathways...
  ],
  "adjacentCareers": [
    { "title": "<title>", "movePattern": "<short>" },
    ...EXACTLY 2 entries...
  ],
  "whoYouWorkWith": [
    { "role": "<e.g. Engineering>", "relationship": "<short>" },
    ...EXACTLY 3 entries...
  ]
}`;

export async function runDescriptionAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<DescriptionResult> {
  const prompt = `Write the "About this career" reference content for: ${skillDiff.target.title} (SOC ${skillDiff.target.socCode}).

Bridge framing the learner is being shown elsewhere on the page (use this to keep voice consistent, NOT to drive the description content): "${skillDiff.headline.framing}"

Note: this content is about THE TARGET CAREER as it actually exists in 2026, not about the user's transition. Don't reference the bridge competency or the user's current role. The transition framing lives elsewhere.

Return only JSON.`;

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

  const parsed = parseAgentJson<DescriptionResult>(text, "Description Agent");

  // Defensive normalization — LLM occasionally drops fields or returns wrong types
  return {
    oneLineDefinition:
      typeof parsed.oneLineDefinition === "string" ? parsed.oneLineDefinition.trim() : "",
    dayInTheLife: {
      morning: String(parsed.dayInTheLife?.morning ?? ""),
      afternoon: String(parsed.dayInTheLife?.afternoon ?? ""),
      eveningOrEdge: String(parsed.dayInTheLife?.eveningOrEdge ?? ""),
    },
    toolsAndArtifacts: Array.isArray(parsed.toolsAndArtifacts)
      ? parsed.toolsAndArtifacts
          .map((t: any) => ({
            name: String(t.name ?? "").trim(),
            purpose: String(t.purpose ?? "").trim(),
          }))
          .filter((t) => t.name.length > 0)
          .slice(0, 12)
      : [],
    ladder: Array.isArray(parsed.ladder)
      ? parsed.ladder
          .map((r: any) => ({
            title: String(r.title ?? "").trim(),
            yearsExperience: String(r.yearsExperience ?? "").trim(),
            compRange: String(r.compRange ?? "").trim(),
            whatChanges: String(r.whatChanges ?? "").trim(),
          }))
          .filter((r) => r.title.length > 0)
          .slice(0, 7)
      : [],
    tradeoffs: {
      pros: Array.isArray(parsed.tradeoffs?.pros)
        ? parsed.tradeoffs.pros.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0).slice(0, 6)
        : [],
      cons: Array.isArray(parsed.tradeoffs?.cons)
        ? parsed.tradeoffs.cons.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0).slice(0, 6)
        : [],
    },
    entryPathways: Array.isArray(parsed.entryPathways)
      ? parsed.entryPathways
          .map((p: any) => ({
            pathway: String(p.pathway ?? "").trim(),
            proportion: String(p.proportion ?? "").trim(),
            notes: String(p.notes ?? "").trim(),
          }))
          .filter((p) => p.pathway.length > 0)
          .slice(0, 6)
      : [],
    adjacentCareers: Array.isArray(parsed.adjacentCareers)
      ? parsed.adjacentCareers
          .map((c: any) => ({
            title: String(c.title ?? "").trim(),
            movePattern: String(c.movePattern ?? "").trim(),
          }))
          .filter((c) => c.title.length > 0)
          .slice(0, 6)
      : [],
    whoYouWorkWith: Array.isArray(parsed.whoYouWorkWith)
      ? parsed.whoYouWorkWith
          .map((c: any) => ({
            role: String(c.role ?? "").trim(),
            relationship: String(c.relationship ?? "").trim(),
          }))
          .filter((c) => c.role.length > 0)
          .slice(0, 7)
      : [],
  };
}

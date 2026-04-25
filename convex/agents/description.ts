/**
 * Description Agent — Sonnet 4.6.
 *
 * Generates the "About this career" reference content: what the role IS in
 * lived terms, not what a competency profile lists. Day-in-the-life, tools,
 * career ladder, trade-offs, entry pathways, adjacent careers, who you work with.
 *
 * Why Sonnet not Haiku: this is the single most-read piece of content on the
 * path page — users come back to it across the whole bridge. Haiku produces
 * generic descriptions ("PMs prioritize features and work with teams"). Sonnet
 * produces specific, lived ones ("Most days start with a 9am standup in Linear,
 * then 90 minutes of Figma review with design before lunch..."). Worth ~3x cost.
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

OUTPUT FORMAT — return ONLY a JSON object, no prose, no markdown:
{
  "oneLineDefinition": "<one sentence; what this role IS, in plain English>",
  "dayInTheLife": {
    "morning": "<3-5 sentences; concrete tools and artifacts named; the actual cadence>",
    "afternoon": "<3-5 sentences; what continues, what shifts, what meetings happen>",
    "eveningOrEdge": "<2-3 sentences; weekly arcs, on-call, async work, edge cases>"
  },
  "toolsAndArtifacts": [
    { "name": "<real tool name>", "purpose": "<one short sentence; what it's for in this role>" },
    ...5 to 10 entries...
  ],
  "ladder": [
    { "title": "<e.g. Associate PM>", "yearsExperience": "<e.g. 0-2 yrs>", "compRange": "<e.g. $90-130K>", "whatChanges": "<one sentence; what shifts at this rung>" },
    ...4 to 6 rungs from entry to senior/staff...
  ],
  "tradeoffs": {
    "pros": ["<3-5 specific pros>"],
    "cons": ["<3-5 honest cons>"]
  },
  "entryPathways": [
    { "pathway": "<e.g. Lateral from engineering>", "proportion": "<e.g. ~30% of new PMs at tech cos>", "notes": "<one sentence>" },
    ...3 to 5 pathways...
  ],
  "adjacentCareers": [
    { "title": "<role title>", "movePattern": "<one sentence; when/why this move happens>" },
    ...3 to 5 entries...
  ],
  "whoYouWorkWith": [
    { "role": "<e.g. Engineering>", "relationship": "<one sentence; what the daily collaboration looks like>" },
    ...3 to 6 entries...
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
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
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

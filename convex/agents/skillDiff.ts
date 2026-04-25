/**
 * Skill Diff Agent — the demo's killer feature.
 *
 * Pipeline:
 *   1. semanticOnetLookup() for both careers (Layer 1/2 instant; Layer 3 LLM ~1-2s if needed)
 *   2. computeCareerDiff() — deterministic skill + knowledge bridge
 *   3. Opus 4.7 call: interprets the diff, picks the headline bridge competency,
 *      writes a one-paragraph framing for the demo display, decides Bloom level for
 *      the bridge module
 *
 * Output: SkillDiffResult — the structured payload downstream content agents (Lesson,
 * Resource, Assessment) consume to generate the bridge module content.
 *
 * Called from convex/orchestrate.ts (Node action runtime).
 */

import Anthropic from "@anthropic-ai/sdk";
import { semanticOnetLookup, type SemanticLookupResult } from "../lib/onetFuzzy";
import { computeCareerDiff, type CareerDiff, type ONetCompetency } from "../lib/onet";

export interface SkillDiffResult {
  // Resolution outputs (from Phase 1)
  current: SemanticLookupResult;
  target: SemanticLookupResult;

  // Deterministic diff (from Phase 2)
  diff: CareerDiff;

  // LLM-narrated headline (from Phase 3 — Opus)
  headline: {
    primaryBridge: ONetCompetency;
    primaryBridgeType: "knowledge" | "skill";
    framing: string;          // 1-2 sentence narrative shown in the UI
    moduleTopic: string;      // what the Lesson Agent should write about
    bloomLevel: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
    estimatedHours: number;   // pacing estimate for the bridge module
  };
}

const OPUS_SYSTEM_PROMPT = `You are the Skill Diff Agent for PathFinder, a career-pivot learning platform.

You receive a structured "career diff" computed from O*NET data: gained skills, gained knowledge areas, shared competencies, and dropped competencies between a current career and a target career.

Your job:
1. Pick the SINGLE most demo-worthy "primary bridge" competency the learner needs to develop. Prefer concrete domain knowledge ("Design", "Computers and Electronics", "Programming") over generic meta-skills ("Critical Thinking", "Active Listening") when both are gained, because concrete competencies make a more visceral demo.
2. Write a 1-2 sentence framing that connects what the learner ALREADY brings to what they need to develop. Reference 1-2 specific competencies they share. Voice: warm, specific, encouraging — like a senior peer who has done this transition.
3. Decide what topic the bridge module should focus on. The topic should be a phrase like "Visual hierarchy and grid systems for non-designers" or "Translating audience research instincts into UX research methodology" — concrete, not generic.
4. Pick a Bloom's Taxonomy level for the bridge module. For careers totally outside the learner's experience, start at "Understand" or "Apply". For closer pivots, "Analyze" or "Evaluate" is fair.
5. Estimate hours for the bridge module: 2-6 hours typical for a single-module bridge.

Return ONLY valid JSON with this shape:
{
  "primaryBridgeElementId": "<elementId from the gained competencies>",
  "primaryBridgeType": "knowledge" | "skill",
  "framing": "<1-2 sentences>",
  "moduleTopic": "<concrete topic phrase>",
  "bloomLevel": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "estimatedHours": <number 2-6>
}`;

function buildOpusPrompt(
  current: SemanticLookupResult,
  target: SemanticLookupResult,
  diff: CareerDiff,
): string {
  const fmt = (c: ONetCompetency) => `${c.elementId} | ${c.name} (importance: ${c.importance})`;
  return `Current career: ${current.title} (${current.socCode})
${current.reasoning ? `(Mapping: ${current.reasoning})\n` : ""}
Target career: ${target.title} (${target.socCode})
${target.reasoning ? `(Mapping: ${target.reasoning})\n` : ""}

GAINED KNOWLEDGE (domain areas the learner needs to develop):
${diff.gainedKnowledge.slice(0, 10).map(fmt).join("\n") || "(none — careers share knowledge domains)"}

GAINED SKILLS (workplace skills the learner needs to develop or strengthen):
${diff.gainedSkills.slice(0, 10).map(fmt).join("\n") || "(none — careers share skill profiles)"}

SHARED COMPETENCIES (what the learner ALREADY brings — useful for framing):
${[...diff.sharedKnowledge, ...diff.sharedSkills].slice(0, 8).map(fmt).join("\n") || "(none)"}

DROPPED COMPETENCIES (what they can deprioritize):
${diff.droppedSkills.slice(0, 5).map(fmt).join("\n") || "(none)"}

Return the JSON skill-diff decision now.`;
}

/**
 * Run the full Skill Diff Agent pipeline.
 * Caller (orchestrator) handles agentRuns row updates around this function.
 */
export async function runSkillDiffAgent(
  anthropic: Anthropic,
  currentCareerInput: string,
  targetCareerInput: string,
): Promise<SkillDiffResult> {
  // Phase 1: resolve both careers (Layer 1/2/3 lookup)
  const [current, target] = await Promise.all([
    semanticOnetLookup(currentCareerInput, anthropic),
    semanticOnetLookup(targetCareerInput, anthropic),
  ]);

  if (!current) {
    throw new Error(`Could not resolve current career: "${currentCareerInput}"`);
  }
  if (!target) {
    throw new Error(`Could not resolve target career: "${targetCareerInput}"`);
  }

  // Phase 2: deterministic diff
  const diff = computeCareerDiff(current.socCode, target.socCode);
  if (!diff) {
    throw new Error(
      `Could not compute diff: missing competency data for ${current.socCode} or ${target.socCode}`,
    );
  }

  // Phase 3: Opus narration
  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 800,
    system: OPUS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildOpusPrompt(current, target, diff) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Opus response had no JSON: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);

  // Locate the primary bridge competency by elementId from the gained arrays
  const allGained = [...diff.gainedKnowledge, ...diff.gainedSkills];
  const primaryBridge =
    allGained.find((c) => c.elementId === parsed.primaryBridgeElementId) ??
    diff.primaryBridge.competency; // fall back to deterministic top pick

  return {
    current,
    target,
    diff,
    headline: {
      primaryBridge,
      primaryBridgeType: parsed.primaryBridgeType ?? diff.primaryBridge.type,
      framing: String(parsed.framing ?? ""),
      moduleTopic: String(parsed.moduleTopic ?? primaryBridge.name),
      bloomLevel: parsed.bloomLevel ?? "Apply",
      estimatedHours: typeof parsed.estimatedHours === "number" ? parsed.estimatedHours : 4,
    },
  };
}

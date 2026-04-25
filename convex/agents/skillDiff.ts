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
import { parseAgentJson } from "../lib/parseJson";

export interface PathOutlineModule {
  number: number;             // module number within the whole path (1..N)
  title: string;
  topic: string;
  skillDomain: string;
  bloomLevel: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
  estimatedHours: number;
  weekRange: string;          // e.g. "Week 1"
  isPrimaryBridge: boolean;   // exactly ONE module across the whole path has this true
}

export interface PathOutlinePhase {
  number: 1 | 2 | 3 | 4;
  title: string;              // e.g. "Phase 1: Foundations"
  bloomLevels: string;        // e.g. "Remember + Understand"
  weekRange: string;          // e.g. "Weeks 1-2"
  modules: PathOutlineModule[];
}

export interface PathOutline {
  title: string;
  totalWeeks: number;
  totalHours: number;
  phases: PathOutlinePhase[];
}

export interface SkillDiffResult {
  // Resolution outputs
  current: SemanticLookupResult;
  target: SemanticLookupResult;

  // Deterministic diff
  diff: CareerDiff;

  // LLM-narrated headline — refers to the primary-bridge module in pathOutline
  headline: {
    primaryBridge: ONetCompetency;
    primaryBridgeType: "knowledge" | "skill";
    framing: string;
    moduleTopic: string;
    bloomLevel: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
    estimatedHours: number;
  };

  // Multi-module path outline — generated upfront, content per module is lazy
  pathOutline?: PathOutline;
}

const OPUS_SYSTEM_PROMPT = `You are the Skill Diff Agent for PathFinder, a career-pivot learning platform.

You receive a structured "career diff" computed from O*NET data: gained skills, gained knowledge areas, shared competencies, and dropped competencies between a current career and a target career.

Your job:

1. Pick the SINGLE most demo-worthy "primary bridge" competency. RULES OF PRIORITY:

   PREFER GAINED KNOWLEDGE over GAINED SKILLS whenever knowledge gains have importance >= 60. O*NET "Knowledge" represents domain areas (Design, Fine Arts, Communications and Media, Mechanical, Customer Service, Computers and Electronics) which are FAR more concrete and identity-defining than O*NET "Skills" (Programming, Active Listening, Critical Thinking, Reading Comprehension).

   For a UX Designer, "Design" knowledge is the bridge — NOT "Programming" skill. UX Designers design, they don't primarily code.
   For a Software Engineer, "Programming" skill IS the bridge because there's no equivalent knowledge area.
   For a Chef, "Food Production" knowledge is the bridge — NOT "Coordination" skill.

   ONLY pick a Skill if there is NO Knowledge gain at importance >= 60.

2. Write a 1-2 sentence framing that:
   - Names the SPECIFIC SHARED competency the learner already brings (e.g. "your comfort with Communications and Media", "your existing Active Listening")
   - Names what's NEW for them (the primary bridge)
   - Connects them with a concrete metaphor or "you already X, now you'll Y" sentence
   - Voice: senior peer who's done this pivot, specific and grounded
   - DO NOT use generic phrasing like "developer's mindset" if the target isn't a developer
   - DO NOT use the word "code" if the target isn't a coding role

3. Module topic: a CONCRETE phrase like "Visual hierarchy and grid systems for non-designers" or "Color theory and accessibility contrast ratios" — specific to the bridge competency for the target career, not generic.

4. Bloom level: "Understand" or "Apply" for big career jumps, "Analyze" or "Evaluate" for closer pivots.

5. Estimated hours: 2-6.

Return ONLY valid JSON with this shape:
{
  "primaryBridgeElementId": "<elementId from gained KNOWLEDGE first, then gained skills if no knowledge>",
  "primaryBridgeType": "knowledge" | "skill",
  "framing": "<1-2 sentences, specific to BOTH careers, accurate to the target's actual work>",
  "moduleTopic": "<concrete topic phrase tied to the primary bridge competency>",
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

  const parsed = parseAgentJson<{
    primaryBridgeElementId?: string;
    primaryBridgeType?: "knowledge" | "skill";
    framing?: string;
    moduleTopic?: string;
    bloomLevel?: SkillDiffResult["headline"]["bloomLevel"];
    estimatedHours?: number;
  }>(text, "Skill Diff Agent");

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

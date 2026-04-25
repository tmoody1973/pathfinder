/**
 * Pure-LLM Skill Diff Agent — Opus 4.7.
 *
 * Replaces the O*NET cascade (overrides → alt titles → fuzzy → Layer 3 LLM
 * → O*NET data lookup → deterministic diff → Opus narration) with ONE call.
 *
 * Key insight: skill diff is a *comparative* task. Given BOTH careers in a
 * SINGLE Opus call, scores are internally consistent on a shared scale. This
 * fixes the O*NET problem for modern roles (PM, UX, DevOps, ML Eng, etc.)
 * where the taxonomy's knowledge categories are too broad or miscategorized.
 *
 * Output shape matches the existing SkillDiffResult interface — downstream
 * agents (Lesson, Resource, Assessment, Course, Books, Community) don't care
 * which path fed them.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseAgentJson } from "../lib/parseJson";
import type { SkillDiffResult } from "./skillDiff";
import type { ONetCompetency } from "../lib/onet";
import type { SemanticLookupResult } from "../lib/onetFuzzy";

const SYSTEM_PROMPT = `You are a senior career analyst. Given two career titles (current, target), you produce structured competency profiles for each on a CONSISTENT 0-100 scale, then compute the bridge a learner must build to transition.

Ground your analysis in what practitioners in these careers actually do in 2026 — real day-to-day work, real tools, real artifacts, real vocabulary. You know LinkedIn profiles, job postings, industry publications. Use that knowledge. Do NOT default to outdated taxonomies (O*NET miscategorizes Product Manager as Marketing Manager, for example — you know better).

For EACH career, produce two arrays:
  knowledge[]: DOMAIN areas (e.g. "Product Management", "User Research Methods", "Communications and Media", "Design", "Programming Languages", "Audio Engineering", "Visual Design", "Data Analysis", "Agile/Scrum Methodology")
  skills[]:   WORKPLACE skills (e.g. "Stakeholder Management", "Critical Thinking", "Active Listening", "Written Communication", "Time Management", "Presenting", "Prioritization")

Each entry has: name (specific, modern phrasing), importance (0-100, how central to the role), level (0-100, how deep the mastery needs to go).

CRITICAL CONSISTENCY RULES — you are comparing two careers, not analyzing them in isolation:
1. If a competency appears in BOTH careers, score it on the SAME scale. If "Active Listening" is 80 for Radio Host, it should be 70-90 for a PM — do NOT score it 30 for PM just because it's a different field. Consistent scoring across careers is what makes the diff meaningful.
2. Be specific with names. "Product Management" beats "Business Skills". "Figma" is a TOOL, not a knowledge area — use "User Interface Design" as the knowledge and reference Figma in level context.
3. 8-12 competencies per career, mix of knowledge (~5-7) and skills (~3-5). More isn't better.
4. For MODERN TECH ROLES, do NOT force them into old-taxonomy categories. A Product Manager's bridge is NOT "Computers and Electronics" (though they need some tech literacy — that's a LEVEL bump, not a primary knowledge domain). It's "Product Management", "User Research", "Data-Driven Decision Making", "Stakeholder Management", "Agile/Scrum".
5. For creative roles, use domain-specific names. "Visual Design" (not "Design"), "Motion Design", "Typography" — each is distinct.

COMPUTE THE BRIDGE:
- gainedKnowledge: domains important in target (importance >= 50) that are NOT in current at comparable importance (current is < 50 OR >15 points lower than target)
- sharedKnowledge: domains important in both at comparable importance (within 15 points) — the learner already brings these
- droppedKnowledge: domains important in current that are NOT important in target — deprioritize
- Same logic for gainedSkills/sharedSkills/droppedSkills
- primaryBridge: the MOST demo-worthy gained competency. Rules:
    PREFER Knowledge over Skills (domain expertise is more concrete than generic workplace skills)
    PREFER specific/modern naming ("Product Management" > "Administration and Management")
    MUST be something the learner genuinely needs to develop from near-zero
- framing: 1-2 sentences. Reference 1-2 SPECIFIC shared competencies they already bring. Name the primary bridge. Use the TARGET career's vocabulary. Do NOT use "developer's mindset" for non-developer targets.
- moduleTopic: concrete phrase tied to the primary bridge IN THE TARGET CAREER's context. "Product discovery and prioritization for aspiring PMs" (not "Introduction to Product Management").
- bloomLevel: Remember | Understand | Apply | Analyze | Evaluate | Create. Big pivots start at Understand/Apply.
- estimatedHours: 2-6 for a single bridge module.

Return ONLY valid JSON with this exact shape:
{
  "current": {
    "title": "concise modern label for this career",
    "profileNote": "1 sentence describing the 2026 version of this role",
    "knowledge": [{ "name": "...", "importance": 0-100, "level": 0-100 }, ...],
    "skills": [{ "name": "...", "importance": 0-100, "level": 0-100 }, ...]
  },
  "target": {
    "title": "concise modern label",
    "profileNote": "1 sentence describing the 2026 version",
    "knowledge": [...],
    "skills": [...]
  },
  "diff": {
    "gainedKnowledge": [{ "name": "...", "importance": 0-100, "level": 0-100 }, ...],
    "sharedKnowledge": [...],
    "droppedKnowledge": [...],
    "gainedSkills": [...],
    "sharedSkills": [...],
    "droppedSkills": [...]
  },
  "headline": {
    "primaryBridgeName": "exact name from gainedKnowledge or gainedSkills",
    "primaryBridgeType": "knowledge" | "skill",
    "primaryBridgeImportance": 0-100,
    "primaryBridgeLevel": 0-100,
    "framing": "1-2 sentences with target-career vocabulary",
    "moduleTopic": "concrete phrase tied to the target career's daily work",
    "bloomLevel": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
    "estimatedHours": 2-6
  }
}`;

/** Stable elementId for Claude-generated competencies. O*NET uses things like
 *  "2.A.1.a" — we prefix ours with "llm." to be distinguishable. */
function competencyId(name: string, type: "knowledge" | "skill"): string {
  return `llm.${type}.${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeCompetency(
  c: any,
  type: "knowledge" | "skill",
): ONetCompetency {
  const name = String(c?.name ?? "").trim();
  const importance = clamp(toNumber(c?.importance), 0, 100);
  const level = clamp(toNumber(c?.level), 0, 100);
  return {
    elementId: competencyId(name, type),
    name,
    importance,
    level,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toSemanticLookup(
  rawTitle: string,
  llmTitle: string,
  profileNote: string,
): SemanticLookupResult {
  return {
    socCode: "", // no SOC in pure-LLM mode
    title: llmTitle || rawTitle,
    closestMatch: false,
    reasoning: profileNote,
    source: "llm",
  };
}

/**
 * Run the pure-LLM skill diff pipeline. One Opus call produces everything
 * downstream agents need.
 */
export async function runPureSkillDiff(
  anthropic: Anthropic,
  currentCareerInput: string,
  targetCareerInput: string,
): Promise<SkillDiffResult> {
  const prompt = `Analyze the career bridge for a learner pivoting:

CURRENT career: ${currentCareerInput}
TARGET career:  ${targetCareerInput}

Produce the full structured analysis per the system prompt. Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseAgentJson<{
    current?: any;
    target?: any;
    diff?: any;
    headline?: any;
  }>(text, "Pure Skill Diff (Opus)");

  const current = parsed.current ?? {};
  const target = parsed.target ?? {};
  const diff = parsed.diff ?? {};
  const headline = parsed.headline ?? {};

  const normArr = (arr: any, type: "knowledge" | "skill"): ONetCompetency[] =>
    Array.isArray(arr)
      ? arr.map((c) => normalizeCompetency(c, type)).filter((c) => c.name.length > 0)
      : [];

  const gainedKnowledge = normArr(diff.gainedKnowledge, "knowledge");
  const gainedSkills = normArr(diff.gainedSkills, "skill");
  const sharedKnowledge = normArr(diff.sharedKnowledge, "knowledge");
  const sharedSkills = normArr(diff.sharedSkills, "skill");
  const droppedKnowledge = normArr(diff.droppedKnowledge, "knowledge");
  const droppedSkills = normArr(diff.droppedSkills, "skill");

  // Locate the primary bridge competency by name in the gained arrays
  const primaryBridgeType: "knowledge" | "skill" =
    headline.primaryBridgeType === "skill" ? "skill" : "knowledge";
  const gainedPool = primaryBridgeType === "knowledge" ? gainedKnowledge : gainedSkills;
  const fallbackPool = primaryBridgeType === "knowledge" ? gainedSkills : gainedKnowledge;

  const bridgeName = String(headline.primaryBridgeName ?? "");
  let primaryBridge =
    gainedPool.find((c) => c.name.toLowerCase() === bridgeName.toLowerCase()) ??
    fallbackPool.find((c) => c.name.toLowerCase() === bridgeName.toLowerCase());

  if (!primaryBridge) {
    // Opus referenced a name not in the gained arrays — construct one from its headline fields
    primaryBridge = {
      elementId: competencyId(bridgeName || "bridge", primaryBridgeType),
      name: bridgeName || (gainedPool[0]?.name ?? "Primary Bridge"),
      importance: clamp(toNumber(headline.primaryBridgeImportance), 0, 100) || 80,
      level: clamp(toNumber(headline.primaryBridgeLevel), 0, 100) || 60,
    };
  }

  const bloomLevel: SkillDiffResult["headline"]["bloomLevel"] = (() => {
    const v = String(headline.bloomLevel ?? "Apply");
    if (
      v === "Remember" ||
      v === "Understand" ||
      v === "Apply" ||
      v === "Analyze" ||
      v === "Evaluate" ||
      v === "Create"
    )
      return v;
    return "Apply";
  })();

  return {
    current: toSemanticLookup(
      currentCareerInput,
      String(current.title ?? currentCareerInput),
      String(current.profileNote ?? ""),
    ),
    target: toSemanticLookup(
      targetCareerInput,
      String(target.title ?? targetCareerInput),
      String(target.profileNote ?? ""),
    ),
    diff: {
      gainedKnowledge,
      sharedKnowledge,
      droppedKnowledge,
      gainedSkills,
      sharedSkills,
      droppedSkills,
      primaryBridge: { competency: primaryBridge, type: primaryBridgeType },
    },
    headline: {
      primaryBridge,
      primaryBridgeType,
      framing: String(headline.framing ?? ""),
      moduleTopic: String(headline.moduleTopic ?? primaryBridge.name),
      bloomLevel,
      estimatedHours:
        clamp(toNumber(headline.estimatedHours), 2, 8) || 4,
    },
  };
}

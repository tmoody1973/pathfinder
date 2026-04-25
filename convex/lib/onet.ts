/**
 * O*NET data loader + lookup helpers for PathFinder Blackathon
 *
 * MOVE THIS FILE to: convex/lib/onet.ts (or wherever your Convex action helpers live)
 * MOVE the bundled data file (onet.json from onet-convert.ts) to: convex/data/onet.json
 *
 * Pure in-memory lookups. Zero network dependencies. ~5-15 MB JSON loaded once at module init.
 *
 * What's in the data:
 *   - skills:    general workplace skills (Speaking, Critical Thinking, Programming, etc.)
 *                Useful but tend to look similar across many occupations.
 *   - knowledge: domain knowledge areas (Computers and Electronics, Design, Fine Arts,
 *                Communications and Media, etc.) Much more concrete and differentiating —
 *                this is what makes the bridge module visually striking.
 *
 * Functions:
 *   - onetLookup(query)              → fuzzy occupation search by title
 *   - onetSkillsForOccupation(soc)   → skills array for a SOC code
 *   - onetKnowledgeForOccupation(soc)→ knowledge array for a SOC code
 *   - computeCareerDiff(curr, target)→ COMBINED skill + knowledge bridge (the demo magic)
 */

import onetData from "../data/onet.json";
import titleOverridesData from "../data/titleOverrides.json";

// === Types ===

export interface ONetCompetency {
  elementId: string;
  name: string;
  importance: number; // 0-100, normalized from raw IM 1-5
  level: number;      // 0-100, normalized from raw LV 0-7
}

export interface ONetOccupation {
  title: string;
  description: string;
  altTitles: string[];            // O*NET Alternate Titles for this SOC
  skills: ONetCompetency[];
  knowledge: ONetCompetency[];
}

export interface TitleOverride {
  socCode: string;
  title: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

export interface ONetLookupResult {
  socCode: string;
  title: string;
  closestMatch: boolean; // true if we fuzzy-matched, false if exact substring hit
}

export interface CareerDiff {
  // Skills diff
  gainedSkills: ONetCompetency[];
  sharedSkills: ONetCompetency[];
  droppedSkills: ONetCompetency[];

  // Knowledge diff (the more demo-friendly one)
  gainedKnowledge: ONetCompetency[];
  sharedKnowledge: ONetCompetency[];
  droppedKnowledge: ONetCompetency[];

  // The headline bridge competency for the demo module — picked from gainedKnowledge
  // first (more concrete) and falling back to gainedSkills if knowledge is empty.
  primaryBridge: {
    competency: ONetCompetency;
    type: "knowledge" | "skill";
  };
}

// === Constants ===

const IMPORTANCE_THRESHOLD = 50;
const OVERLAP_TOLERANCE = 15;

// === Cast and index ===

const ONET: Record<string, ONetOccupation> = onetData as any;

const OVERRIDES: Record<string, TitleOverride> =
  (titleOverridesData as { overrides?: Record<string, TitleOverride> }).overrides ?? {};

// === Full-text index combining official titles + all O*NET Alternate Titles ===
// Each entry points to its SOC code and records whether it's the primary or an alternate.
interface IndexEntry {
  socCode: string;
  text: string;        // original casing
  textLower: string;
  kind: "primary" | "alternate";
}

const titleIndex: IndexEntry[] = (() => {
  const entries: IndexEntry[] = [];
  for (const [socCode, occ] of Object.entries(ONET)) {
    entries.push({
      socCode,
      text: occ.title,
      textLower: occ.title.toLowerCase(),
      kind: "primary",
    });
    for (const alt of occ.altTitles ?? []) {
      entries.push({
        socCode,
        text: alt,
        textLower: alt.toLowerCase(),
        kind: "alternate",
      });
    }
  }
  return entries;
})();

// === Public functions ===

/**
 * Three-layer static lookup:
 *   1. titleOverrides.json — hand-curated fixes for modern titles O*NET miscategorizes
 *   2. Exact title/alt-title match against the 894-occupation + 48k-alt-title index
 *   3. Token-overlap fuzzy match against the same index
 *
 * Returns null if no match above minimum confidence. Caller (semanticOnetLookup)
 * then falls back to an LLM if null.
 */
export function onetLookup(query: string): ONetLookupResult | null {
  if (!query || query.trim().length === 0) return null;
  const q = query.trim().toLowerCase();

  // Layer 1: curated overrides for titles O*NET gets wrong
  const override = OVERRIDES[q];
  if (override && ONET[override.socCode]) {
    return {
      socCode: override.socCode,
      title: override.title,
      closestMatch: false,
    };
  }

  // Layer 2a: exact alt-title or official-title match (whole-string equality)
  const exactEq = titleIndex.find((t) => t.textLower === q);
  if (exactEq) {
    const occ = ONET[exactEq.socCode];
    return {
      socCode: exactEq.socCode,
      title: occ?.title ?? exactEq.text,
      closestMatch: false,
    };
  }

  // Layer 2b: substring match (query appears inside a title or alt title)
  const exactSub = titleIndex.find((t) => t.textLower.includes(q));
  if (exactSub) {
    const occ = ONET[exactSub.socCode];
    return {
      socCode: exactSub.socCode,
      title: occ?.title ?? exactSub.text,
      closestMatch: false,
    };
  }

  // Layer 3: token-overlap fuzzy match
  const queryTokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (queryTokens.length === 0) return null;

  let best: { socCode: string; score: number } | null = null;
  for (const entry of titleIndex) {
    const matched = queryTokens.filter((t) => entry.textLower.includes(t)).length;
    if (matched === 0) continue;
    const score = matched / queryTokens.length;
    if (!best || score > best.score) {
      best = { socCode: entry.socCode, score };
    }
  }

  if (!best || best.score < 0.5) return null;
  const occ = ONET[best.socCode];
  return {
    socCode: best.socCode,
    title: occ?.title ?? "",
    closestMatch: true,
  };
}

/** Return the curated override for a query if one exists. Used by semanticOnetLookup
 *  to surface the rich reasoning string from the override table rather than a generic fuzzy reason. */
export function getTitleOverride(query: string): TitleOverride | null {
  return OVERRIDES[query.trim().toLowerCase()] ?? null;
}

export function onetSkillsForOccupation(socCode: string): ONetCompetency[] {
  return ONET[socCode]?.skills ?? [];
}

export function onetKnowledgeForOccupation(socCode: string): ONetCompetency[] {
  return ONET[socCode]?.knowledge ?? [];
}

export function onetOccupation(socCode: string): ONetOccupation | null {
  return ONET[socCode] ?? null;
}

/**
 * Diff a single competency array between two occupations.
 * Used internally by computeCareerDiff for both skills and knowledge.
 */
function diffCompetencies(
  current: ONetCompetency[],
  target: ONetCompetency[]
): { gained: ONetCompetency[]; shared: ONetCompetency[]; dropped: ONetCompetency[] } {
  const currentMap = new Map(current.map((c) => [c.elementId, c]));
  const targetMap = new Map(target.map((c) => [c.elementId, c]));

  const gained: ONetCompetency[] = [];
  const shared: ONetCompetency[] = [];
  const dropped: ONetCompetency[] = [];

  for (const t of target) {
    if (t.importance < IMPORTANCE_THRESHOLD) continue;
    const c = currentMap.get(t.elementId);
    if (!c || c.importance < IMPORTANCE_THRESHOLD) {
      gained.push(t);
    } else if (Math.abs(c.importance - t.importance) <= OVERLAP_TOLERANCE) {
      shared.push(t);
    } else if (c.importance < t.importance) {
      gained.push(t);
    } else {
      shared.push(t);
    }
  }

  for (const c of current) {
    if (c.importance < IMPORTANCE_THRESHOLD) continue;
    const t = targetMap.get(c.elementId);
    if (!t || t.importance < IMPORTANCE_THRESHOLD) {
      dropped.push(c);
    }
  }

  gained.sort((a, b) => b.importance - a.importance);
  dropped.sort((a, b) => b.importance - a.importance);

  return { gained, shared, dropped };
}

/**
 * THE killer feature for the demo. Computes both skill and knowledge bridges,
 * picks the most demo-worthy headline competency, and returns everything the
 * Skill Diff Agent needs to write a meaningful bridge module.
 *
 * Knowledge tends to be more concrete ("Computers and Electronics", "Fine Arts")
 * so the primary bridge is preferentially chosen from gainedKnowledge if there
 * are any. Falls back to gainedSkills for cases where the careers share knowledge
 * domains but differ in workplace skills.
 */
export function computeCareerDiff(
  currentSocCode: string,
  targetSocCode: string
): CareerDiff | null {
  const currentOcc = ONET[currentSocCode];
  const targetOcc = ONET[targetSocCode];
  if (!currentOcc || !targetOcc) return null;

  const skills = diffCompetencies(currentOcc.skills, targetOcc.skills);
  const knowledge = diffCompetencies(currentOcc.knowledge, targetOcc.knowledge);

  // Edge case: ensure we always have something to talk about
  let primaryBridge: CareerDiff["primaryBridge"];
  if (knowledge.gained.length > 0) {
    primaryBridge = { competency: knowledge.gained[0], type: "knowledge" };
  } else if (skills.gained.length > 0) {
    primaryBridge = { competency: skills.gained[0], type: "skill" };
  } else {
    // Truly identical careers — pick the most important target knowledge as a level-up
    const fallback =
      targetOcc.knowledge[0] ?? targetOcc.skills[0];
    if (!fallback) return null;
    primaryBridge = {
      competency: fallback,
      type: targetOcc.knowledge.length > 0 ? "knowledge" : "skill",
    };
  }

  return {
    gainedSkills: skills.gained,
    sharedSkills: skills.shared,
    droppedSkills: skills.dropped,
    gainedKnowledge: knowledge.gained,
    sharedKnowledge: knowledge.shared,
    droppedKnowledge: knowledge.dropped,
    primaryBridge,
  };
}

/**
 * Backwards-compatible alias for the older Skills-only diff.
 * Kept so design doc references continue to resolve. New code should use computeCareerDiff.
 */
export function computeSkillDiff(
  currentSocCode: string,
  targetSocCode: string
): CareerDiff | null {
  return computeCareerDiff(currentSocCode, targetSocCode);
}

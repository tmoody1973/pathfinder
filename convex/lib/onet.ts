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
  skills: ONetCompetency[];
  knowledge: ONetCompetency[];
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

const titleIndex: Array<{ socCode: string; titleLower: string; title: string }> =
  Object.entries(ONET).map(([socCode, occ]) => ({
    socCode,
    title: occ.title,
    titleLower: occ.title.toLowerCase(),
  }));

// === Public functions ===

export function onetLookup(query: string): ONetLookupResult | null {
  if (!query || query.trim().length === 0) return null;
  const q = query.trim().toLowerCase();

  // 1. Exact substring match
  const exact = titleIndex.find((t) => t.titleLower.includes(q));
  if (exact) {
    return { socCode: exact.socCode, title: exact.title, closestMatch: false };
  }

  // 2. Token-overlap fuzzy match
  const queryTokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (queryTokens.length === 0) return null;

  let best: { socCode: string; title: string; score: number } | null = null;
  for (const entry of titleIndex) {
    const matched = queryTokens.filter((t) => entry.titleLower.includes(t)).length;
    if (matched === 0) continue;
    const score = matched / queryTokens.length;
    if (!best || score > best.score) {
      best = { socCode: entry.socCode, title: entry.title, score };
    }
  }

  if (!best || best.score < 0.3) return null;
  return { socCode: best.socCode, title: best.title, closestMatch: true };
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

#!/usr/bin/env bun
/**
 * O*NET data → bundled JSON converter (Skills + Knowledge)
 *
 * Run ONCE before the build. Produces `onet.json` you bundle with your Convex deploy.
 *
 * Usage:
 *   1. Download the latest O*NET database (text format) from:
 *      https://www.onetcenter.org/database.html
 *   2. Unzip it. You'll get a folder like `db_30_2_text/` with Skills.txt,
 *      Knowledge.txt, Occupation Data.txt, etc.
 *   3. Run:  bun starter/onet-convert.ts ./db_30_2_text ./starter/onet.json
 *   4. The output JSON drops into convex/data/onet.json when you scaffold the project.
 *
 * Output JSON shape (keyed by SOC code):
 *   {
 *     "27-3011.00": {
 *       title: "Broadcast Announcers and Radio Disc Jockeys",
 *       description: "Speak or read from scripted materials...",
 *       skills: [
 *         { elementId: "2.A.1.a", name: "Active Listening", importance: 87, level: 71 },
 *         ...
 *       ],
 *       knowledge: [
 *         { elementId: "2.C.7.a", name: "Communications and Media", importance: 88, level: 76 },
 *         ...
 *       ]
 *     },
 *     ...
 *   }
 *
 * Why both?
 *   - "Skills" are general workplace meta-skills (Speaking, Critical Thinking, etc.)
 *     Useful but tend to look similar across many occupations.
 *   - "Knowledge" are domain areas (Computers and Electronics, Design, Fine Arts,
 *     Communications and Media). Much more concrete and differentiating —
 *     surface these in the demo bridge module.
 *
 * Score normalization:
 *   - Importance (IM) is rated 1-5 in raw O*NET → normalized to 0-100 here
 *   - Level (LV) is rated 0-7 in raw O*NET → normalized to 0-100 here
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface ONetCompetency {
  elementId: string;
  name: string;
  importance: number; // 0-100
  level: number;      // 0-100
}

interface ONetOccupation {
  title: string;
  description: string;
  altTitles: string[];         // Alternate Titles.txt entries for this SOC code
  skills: ONetCompetency[];
  knowledge: ONetCompetency[];
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: bun onet-convert.ts <onet-text-folder> <output.json>");
  console.error("  Example: bun onet-convert.ts ./db_30_2_text ./onet.json");
  process.exit(1);
}

const [inputFolder, outputPath] = args;

function parseTSV(filePath: string): Record<string, string>[] {
  if (!existsSync(filePath)) {
    console.warn(`  WARNING: ${filePath} not found, skipping.`);
    return [];
  }
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? "";
    }
    return row;
  });
}

/**
 * Pivot a Skills/Knowledge/Abilities-style table into per-occupation competency arrays.
 * Each row in the source is one (occupation, element, scale) triple. Each element has
 * two rows per occupation (one IM = importance 1-5, one LV = level 0-7) which we merge.
 */
function pivotCompetencies(
  rows: Record<string, string>[]
): Map<string, Map<string, ONetCompetency>> {
  const byOccupation = new Map<string, Map<string, ONetCompetency>>();
  // First pass: collect raw IM and LV per (soc, elementId)
  type Raw = { name: string; im?: number; lv?: number };
  const raw = new Map<string, Map<string, Raw>>();

  for (const row of rows) {
    const socCode = row["O*NET-SOC Code"];
    const elementId = row["Element ID"];
    const elementName = row["Element Name"];
    const scaleId = row["Scale ID"];
    const dataValueStr = row["Data Value"];
    if (!socCode || !elementId || !scaleId || !dataValueStr) continue;
    const dataValue = parseFloat(dataValueStr);
    if (Number.isNaN(dataValue)) continue;

    let occMap = raw.get(socCode);
    if (!occMap) {
      occMap = new Map();
      raw.set(socCode, occMap);
    }
    const entry = occMap.get(elementId) ?? { name: elementName };
    if (scaleId === "IM") entry.im = dataValue;
    else if (scaleId === "LV") entry.lv = dataValue;
    occMap.set(elementId, entry);
  }

  // Second pass: normalize and convert to ONetCompetency
  for (const [socCode, occMap] of raw.entries()) {
    const competencies = new Map<string, ONetCompetency>();
    for (const [elementId, entry] of occMap.entries()) {
      if (entry.im === undefined && entry.lv === undefined) continue;
      // IM is 1-5 → 0-100; LV is 0-7 → 0-100
      const importance =
        entry.im !== undefined ? Math.round(((entry.im - 1) / 4) * 100) : 0;
      const level =
        entry.lv !== undefined ? Math.round((entry.lv / 7) * 100) : 0;
      competencies.set(elementId, {
        elementId,
        name: entry.name,
        importance,
        level,
      });
    }
    byOccupation.set(socCode, competencies);
  }

  return byOccupation;
}

console.log("Reading Occupation Data.txt...");
const occupationRows = parseTSV(join(inputFolder, "Occupation Data.txt"));
console.log(`  → ${occupationRows.length} occupations`);

console.log("Reading Skills.txt...");
const skillRows = parseTSV(join(inputFolder, "Skills.txt"));
console.log(`  → ${skillRows.length} skill rows (IM + LV)`);

console.log("Reading Knowledge.txt...");
const knowledgeRows = parseTSV(join(inputFolder, "Knowledge.txt"));
console.log(`  → ${knowledgeRows.length} knowledge rows (IM + LV)`);

console.log("Reading Alternate Titles.txt...");
const altTitleRows = parseTSV(join(inputFolder, "Alternate Titles.txt"));
console.log(`  → ${altTitleRows.length} alternate titles`);

const skillsByOcc = pivotCompetencies(skillRows);
const knowledgeByOcc = pivotCompetencies(knowledgeRows);

// Build alternate titles index: SOC code → Set of alt title strings
const altTitlesBySoc = new Map<string, Set<string>>();
for (const row of altTitleRows) {
  const socCode = row["O*NET-SOC Code"];
  const alt = row["Alternate Title"];
  if (!socCode || !alt) continue;
  let set = altTitlesBySoc.get(socCode);
  if (!set) {
    set = new Set();
    altTitlesBySoc.set(socCode, set);
  }
  set.add(alt.trim());
}

const occupations = new Map<string, ONetOccupation>();
for (const row of occupationRows) {
  const socCode = row["O*NET-SOC Code"];
  if (!socCode) continue;
  const skillsMap = skillsByOcc.get(socCode);
  const knowledgeMap = knowledgeByOcc.get(socCode);

  const skills = skillsMap ? Array.from(skillsMap.values()) : [];
  const knowledge = knowledgeMap ? Array.from(knowledgeMap.values()) : [];

  // Sort by importance descending so the diff agent gets the most relevant first
  skills.sort((a, b) => b.importance - a.importance);
  knowledge.sort((a, b) => b.importance - a.importance);

  const altTitlesSet = altTitlesBySoc.get(socCode);
  const altTitles = altTitlesSet ? Array.from(altTitlesSet).sort() : [];

  occupations.set(socCode, {
    title: row["Title"] ?? "",
    description: row["Description"] ?? "",
    altTitles,
    skills,
    knowledge,
  });
}

// Build final output, drop occupations with no skills AND no knowledge (incomplete entries)
const output: Record<string, ONetOccupation> = {};
let droppedEmpty = 0;
let totalSkills = 0;
let totalKnowledge = 0;
let totalAltTitles = 0;
for (const [socCode, occ] of occupations.entries()) {
  if (occ.skills.length === 0 && occ.knowledge.length === 0) {
    droppedEmpty++;
    continue;
  }
  output[socCode] = occ;
  totalSkills += occ.skills.length;
  totalKnowledge += occ.knowledge.length;
  totalAltTitles += occ.altTitles.length;
}

writeFileSync(outputPath, JSON.stringify(output, null, 2));

const sizeKb = Math.round(JSON.stringify(output).length / 1024);
console.log(`\n✓ Wrote ${outputPath}`);
console.log(`  Occupations:             ${Object.keys(output).length}`);
console.log(`  Skill rows attached:     ${totalSkills}`);
console.log(`  Knowledge rows attached: ${totalKnowledge}`);
console.log(`  Alt titles attached:     ${totalAltTitles}`);
console.log(`  Dropped (empty):         ${droppedEmpty}`);
console.log(`  Output size:             ${sizeKb} KB`);
console.log(`\nNext: copy ${outputPath} to convex/data/onet.json when you scaffold the project.`);

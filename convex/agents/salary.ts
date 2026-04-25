/**
 * Salary Agent — Perplexity Sonar (chat/completions) with citations.
 *
 * Sonar is the right tool here: salary data needs to be CURRENT and
 * LOCATION-SPECIFIC, with REAL CITATIONS. Opus's training-data salary numbers
 * are national-only and ~6-12 months stale. Sonar searches the web (Indeed,
 * Glassdoor, BLS OEWS, Built In, Levels.fyi, ZipRecruiter) and returns
 * synthesized numbers with the source URLs.
 *
 * Output: structured JSON profile per career — median, range, outlook, entry
 * education, plus a list of source URLs the user can verify.
 */

import { askSonar } from "../lib/perplexity";
import { parseAgentJson } from "../lib/parseJson";

export interface SalaryDataPoint {
  source: string;       // e.g. "Indeed", "Glassdoor", "BLS OEWS", "Levels.fyi"
  median?: number;      // their reported median, if applicable
  range?: string;       // e.g. "$95K – $130K"
  url?: string;         // citation URL
}

export interface CareerSalaryFromSonar {
  career: string;
  city: string | null;
  medianAnnual: number | null;
  range: string;        // human-readable, e.g. "$105K – $135K"
  outlookGrowth: string;
  entryEducation: string;
  blsProxyNote: string; // when target career has no direct BLS code, note the proxy used
  dataPoints: SalaryDataPoint[];
}

export interface SalaryResult {
  current: CareerSalaryFromSonar;
  target: CareerSalaryFromSonar;
  citations: string[];  // all source URLs Sonar surfaced
}

const SYSTEM_PROMPT = `You are a salary research analyst. You synthesize salary data for two careers from the web — using Indeed, Glassdoor, Built In, Levels.fyi, ZipRecruiter, BLS OEWS, and similar sources — and return a structured comparison.

CRITICAL:
1. Use ONLY data from the search results returned to you. Do NOT invent specific dollar amounts.
2. When a career title doesn't have a direct BLS SOC match (e.g. "Product Manager"), explicitly note the BLS proxy used (e.g. "BLS-style proxy: Project Management Specialists, SOC 13-1082"). Honest disclosure is the brand here.
3. If the user provided a city, use city-specific data when available. If only national data is found, state that.
4. Round dollars to the nearest $1K. Use $XXK formatting in ranges.

For each career, return:
- medianAnnual: a single representative median annual salary in USD (number, no currency)
- range: human-readable range capturing the variance across sources, e.g. "$105K – $135K"
- outlookGrowth: 10-year projected growth ("23% (much faster than average)" / "5% (average)" / "-3% (declining)")
- entryEducation: typical entry-level education
- blsProxyNote: 1 sentence on which BLS code was used and why, OR "Direct BLS match"
- dataPoints: 3-5 entries citing specific sources with URLs

Return ONLY valid JSON, no prose:
{
  "current": {
    "career": "<exact title>",
    "city": "<echoed city or null>",
    "medianAnnual": <number>,
    "range": "$XXXK – $XXXK",
    "outlookGrowth": "<percentage + qualitative>",
    "entryEducation": "<degree level>",
    "blsProxyNote": "<1 sentence>",
    "dataPoints": [
      { "source": "Indeed", "median": 109791, "range": "$95K - $125K", "url": "https://..." }
    ]
  },
  "target": { ...same shape... }
}`;

export async function runSalaryAgent({
  currentCareer,
  targetCareer,
  city,
}: {
  currentCareer: string;
  targetCareer: string;
  city?: string;
}): Promise<SalaryResult> {
  const cityClause = city
    ? `in ${city} (use city-specific data when available; fall back to national medians otherwise)`
    : "(US national data; mention if city-level data is available for follow-up)";

  const userPrompt = `Research and compare current salary data for these two careers ${cityClause}:

CURRENT career: ${currentCareer}
TARGET career:  ${targetCareer}

For each, find recent (last 12 months) salary data from Indeed, Glassdoor, Built In, Levels.fyi, ZipRecruiter, and BLS OEWS. Synthesize a representative median, a percentile range, the 10-year outlook, and entry education requirements. If a career title doesn't have a direct BLS SOC match, note the proxy used.

Return only JSON per the schema.`;

  const sonarResponse = await askSonar(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    {
      model: "sonar",
      maxTokens: 2000,
    },
  );

  const parsed = parseAgentJson<{
    current?: any;
    target?: any;
  }>(sonarResponse.content, "Salary Agent");

  return {
    current: normalizeCareerSalary(parsed.current, currentCareer, city),
    target: normalizeCareerSalary(parsed.target, targetCareer, city),
    citations: sonarResponse.citations,
  };
}

function normalizeCareerSalary(
  raw: any,
  fallbackCareer: string,
  fallbackCity?: string,
): CareerSalaryFromSonar {
  const median = Number(raw?.medianAnnual);
  return {
    career: String(raw?.career ?? fallbackCareer),
    city: typeof raw?.city === "string" && raw.city.length > 0 ? raw.city : fallbackCity ?? null,
    medianAnnual: Number.isFinite(median) && median > 0 ? Math.round(median) : null,
    range: String(raw?.range ?? ""),
    outlookGrowth: String(raw?.outlookGrowth ?? ""),
    entryEducation: String(raw?.entryEducation ?? ""),
    blsProxyNote: String(raw?.blsProxyNote ?? ""),
    dataPoints: Array.isArray(raw?.dataPoints)
      ? raw.dataPoints
          .map((dp: any) => ({
            source: String(dp?.source ?? ""),
            median:
              typeof dp?.median === "number" && Number.isFinite(dp.median)
                ? Math.round(dp.median)
                : undefined,
            range: typeof dp?.range === "string" ? dp.range : undefined,
            url: typeof dp?.url === "string" ? dp.url : undefined,
          }))
          .filter((dp: any) => dp.source.length > 0)
          .slice(0, 6)
      : [],
  };
}

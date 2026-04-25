/**
 * Target Resolver Agent — Sonnet 4.6.
 *
 * For users who don't yet know what target career they want. Takes a profile
 * (LinkedIn About + Experience, or résumé) plus optional interests, and proposes
 * 3 career suggestions with reasoning that cites specific phrases from the profile.
 *
 * The output of this agent feeds the existing bridge pipeline: user picks one
 * suggestion, that becomes `targetCareer`, and createPath fires as normal. So
 * discovery is a precursor, not a separate flow.
 *
 * Why Sonnet not Haiku: this needs judgment. Haiku will produce three generic
 * defaults ("Product Manager / Data Analyst / UX Designer") for almost any
 * profile. Sonnet actually reads the input and reasons about non-obvious
 * adjacencies. ~3x cost is justified.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseAgentJson } from "../lib/parseJson";

export interface TargetSuggestion {
  /** Short modern title, e.g. "Product Designer". Not "Senior Lead Product Design Architect". */
  title: string;
  /** Best-guess SOC code so downstream agents can reuse it. Optional — can be "" if unsure. */
  socHint: string;
  /**
   * Two-to-three sentences of WHY this career fits THIS person, citing
   * specific phrases from their profile or interests. No generic platitudes.
   */
  reasoning: string;
  /**
   * 1-10. How big a jump this is from the user's current position.
   * 1 = lateral move (same domain, different title).
   * 5 = adjacent jump (related field, transferable skills).
   * 10 = full reinvention (new domain entirely).
   * Useful as a UX signal: lower reach = faster path, higher reach = more interesting.
   */
  reachScore: number;
  /** One concrete action this person could take this week to test the fit. */
  firstStep: string;
}

export interface TargetResolverInput {
  profileText: string;
  interests?: string;
  currentCareer?: string;
}

export interface TargetResolverOutput {
  /** True if profile was thin and suggestions may be generic. UI can warn user. */
  thinProfile: boolean;
  /** One-line read on the user's situation, used as the modal headline. */
  oneLineRead: string;
  suggestions: TargetSuggestion[];
}

const SYSTEM_PROMPT = `You are a senior career counselor. You read a person's LinkedIn / résumé and propose 3 career directions that fit THEIR specific background, not generic defaults.

NON-NEGOTIABLE RULES:
1. EVERY reasoning string MUST cite at least one specific phrase, role, skill, project, or detail from the profile or interests. Direct quotes preferred. Generic reasoning ("you have transferable skills", "your background is well-suited") is forbidden.
2. The 3 suggestions must be DIFFERENT shapes. Not three flavors of the same direction. Mix reach levels: at least one safer adjacent move (reach 2-4), at least one stretch (reach 6-8). Avoid all three being reach 5.
3. Be specific with titles. "Product Designer" beats "Designer". "Customer Success Manager (B2B SaaS)" beats "Manager". Use modern industry phrasing, not 2015 phrasing.
4. socHint should be the canonical SOC code for downstream lookups. Use:
   - Product Manager (tech) → 11-3021.00
   - Product Designer / UX Designer → 15-1255.00
   - Software Engineer → 15-1252.00
   - Data Scientist / ML Engineer → 15-2051.00
   - Data Analyst → 15-2041.00
   - DevOps / SRE → 15-1244.00
   - Graphic Designer → 27-1024.00
   - Marketing Manager → 11-2021.00
   - Project Manager → 13-1082.00
   - Customer Success / Account Mgmt → 13-1151.00
   - Technical Writer → 27-3042.00
   - Sales Engineer → 41-9031.00
   If genuinely unsure, return "".
5. firstStep is a concrete, doable-this-week action. Examples: "Spend 2 hours on a Figma file recreating one screen of an app you use daily", "Find 3 Product Manager job posts and write the bullet points YOU could already claim from your current role", "DM 2 Customer Success Managers on LinkedIn for a 15-min coffee call". Not generic ("research the field", "take a course").
6. If the profile is < 200 chars or has almost no signal (e.g. "Manager at Company"), set thinProfile: true. Suggestions in that case must explicitly say "with this thin profile, here's a likely direction — paste more for a sharper read".
7. oneLineRead is your honest read of who this person is and where they sit. One sentence. Examples: "You're a senior accountant with weekend Figma habits — design careers are not as far as you think." "You're 5 years into product marketing and clearly want to be closer to the build side."

OUTPUT FORMAT — return ONLY a JSON object, no prose, no markdown:
{
  "thinProfile": boolean,
  "oneLineRead": string,
  "suggestions": [
    {
      "title": string,
      "socHint": string,
      "reasoning": string,
      "reachScore": number,
      "firstStep": string
    },
    { ... },
    { ... }
  ]
}`;

function buildUserMessage(input: TargetResolverInput): string {
  const lines: string[] = [];
  if (input.currentCareer && input.currentCareer.trim().length > 0) {
    lines.push(`CURRENT ROLE / TITLE: ${input.currentCareer.trim()}`);
  }
  lines.push(`PROFILE (LinkedIn About + Experience, or résumé):`);
  lines.push(`"""`);
  lines.push(input.profileText.slice(0, 8000));
  lines.push(`"""`);
  if (input.interests && input.interests.trim().length > 0) {
    lines.push(``);
    lines.push(`INTERESTS / WHAT THEY ENJOY:`);
    lines.push(`"""`);
    lines.push(input.interests.slice(0, 2000));
    lines.push(`"""`);
  }
  lines.push(``);
  lines.push(`Return 3 career suggestions per the system prompt rules. JSON only.`);
  return lines.join("\n");
}

export async function resolveTargetCareer(
  anthropic: Anthropic,
  input: TargetResolverInput,
): Promise<TargetResolverOutput> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseAgentJson<TargetResolverOutput>(text, "targetResolver");

  // Defensive normalization — LLM occasionally drops fields or returns wrong types
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const cleaned: TargetSuggestion[] = suggestions.slice(0, 3).map((s) => ({
    title: typeof s.title === "string" ? s.title.trim() : "Unknown",
    socHint: typeof s.socHint === "string" ? s.socHint.trim() : "",
    reasoning: typeof s.reasoning === "string" ? s.reasoning.trim() : "",
    reachScore:
      typeof s.reachScore === "number" && Number.isFinite(s.reachScore)
        ? Math.max(1, Math.min(10, Math.round(s.reachScore)))
        : 5,
    firstStep: typeof s.firstStep === "string" ? s.firstStep.trim() : "",
  }));

  return {
    thinProfile: Boolean(parsed.thinProfile),
    oneLineRead:
      typeof parsed.oneLineRead === "string" && parsed.oneLineRead.trim().length > 0
        ? parsed.oneLineRead.trim()
        : "Here are three directions worth considering.",
    suggestions: cleaned,
  };
}

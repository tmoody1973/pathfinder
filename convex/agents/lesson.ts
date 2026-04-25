/**
 * Lesson Agent — Haiku 4.5.
 *
 * Writes the narrative bridge module: 800-1500 word lesson grounded in the
 * primary bridge competency, "professional explaining to an apprentice" voice,
 * with try-this micro-exercises throughout.
 *
 * Output is structured: an intro plus 3-4 sections with heading, body, and
 * an embedded "try this" exercise. The UI renders this as scrollable content.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { parseAgentJson } from "../lib/parseJson";

export interface LessonSection {
  heading: string;
  body: string;
  tryThis: string;
}

export interface LessonResult {
  intro: string;
  sections: LessonSection[];
}

const SYSTEM_PROMPT = `You write narrative instructional lessons for career bridge modules on PathFinder.

Voice: a working professional explaining to a skilled-but-different apprentice. The reader is mid-career — they already know how to learn, work hard, and own outcomes. They just need this specific competency translated from where they ARE to where they need to be.

CRITICAL — TARGET CAREER ANCHORING: Every section, analogy, and "try this" exercise must be grounded in the TARGET CAREER's day-to-day work. If the target is UX Designer, examples reference Figma, user flows, wireframes, design systems, accessibility audits, stakeholder reviews. If the target is Software Developer, examples reference repos, code reviews, deployment, debugging. NEVER write a UX lesson that drifts into game design, animation, or motion graphics. NEVER write a software developer lesson that drifts into pure visual design. The target career is named in your input — use its actual vocabulary, not a generic "design" or "tech" register.

Style:
- Lead with concrete framing using something the learner already does well (referenced in the diff)
- Use analogies that connect their CURRENT career to the TARGET career — not to a third unrelated field
- Avoid cheerleading. Be direct, specific, occasionally dry
- "Try this" exercises must be genuinely doable in 5 minutes AND set in the target career's tools/context
- 800-1500 words total across all sections

Return ONLY valid JSON with this exact shape:
{
  "intro": "<2-3 sentence framing — references their current career in concrete terms, names the target career and the bridge competency>",
  "sections": [
    {
      "heading": "<short, specific to the target career's vocabulary>",
      "body": "<2-3 paragraphs of narrative content set in target-career context>",
      "tryThis": "<1-2 sentence concrete micro-exercise using target-career tools/artifacts>"
    },
    ... 3 to 4 total sections
  ]
}`;

export async function runLessonAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<LessonResult> {
  const sharedContext = [...skillDiff.diff.sharedKnowledge, ...skillDiff.diff.sharedSkills]
    .slice(0, 5)
    .map((c) => `${c.name} (${c.importance})`)
    .join(", ");

  const prompt = `Build a bridge lesson for a learner pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}.

Primary bridge competency: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType}, importance ${skillDiff.headline.primaryBridge.importance})
Module topic: ${skillDiff.headline.moduleTopic}
Bloom level: ${skillDiff.headline.bloomLevel}

What they already bring: ${sharedContext || "(general workplace competencies)"}.
Bridge framing from skill-diff agent: "${skillDiff.headline.framing}"

Write the lesson now. Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseAgentJson<{ intro?: unknown; sections?: unknown }>(
    text,
    "Lesson Agent",
  );

  if (typeof parsed.intro !== "string" || !Array.isArray(parsed.sections)) {
    throw new Error("Lesson Agent: malformed JSON shape");
  }

  return {
    intro: parsed.intro,
    sections: parsed.sections.map((s: any) => ({
      heading: String(s.heading ?? ""),
      body: String(s.body ?? ""),
      tryThis: String(s.tryThis ?? ""),
    })),
  };
}

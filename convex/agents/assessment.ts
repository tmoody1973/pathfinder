/**
 * Assessment Agent — Haiku 4.5.
 *
 * Generates a structured 3-question scenario quiz plus one portfolio-grade
 * project brief. Each is grounded in the primary bridge competency and the
 * Bloom level chosen by the Skill Diff Agent.
 *
 * Output schema is locked so the UI can render it deterministically.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SkillDiffResult } from "./skillDiff";
import { parseAgentJson } from "../lib/parseJson";

export interface QuizQuestion {
  q: string;
  options: string[];      // 4 options
  correct: number;        // 0-3 index into options
  explanation: string;    // why the correct answer is correct
}

export interface ProjectBrief {
  title: string;
  brief: string;
  deliverables: string[];
  skillsDemonstrated: string[];
  estimatedHours: number;
  isPortfolioArtifact: boolean;
}

export interface AssessmentResult {
  quiz: QuizQuestion[];
  project: ProjectBrief;
}

const SYSTEM_PROMPT = `You design assessments for career bridge modules on PathFinder.

CRITICAL: Every quiz scenario AND the project brief must be set in the TARGET CAREER's actual work context — not adjacent fields. If the target is UX Designer, scenarios happen at user research sessions, design crits, prototype reviews, accessibility audits — NOT at game studios, animation pipelines, or video productions. If the target is Software Developer, scenarios happen at standups, code reviews, debugging sessions, deployments — NOT at design meetings or marketing campaigns.

Use the target career's vocabulary. UX scenarios use "wireframe", "user flow", "design system", "stakeholder", "Figma", "research insight", "accessibility". Game design scenarios use "level design", "playtest", "asset pipeline", "engine". Use the right one. Do not blend fields.

Two outputs:

QUIZ — exactly 3 questions:
- Each is a SCENARIO question — situate the learner in a realistic situation IN THE TARGET CAREER's day-to-day work.
- The scenario must reference real artifacts, tools, or stakeholders from the target career.
- 4 multiple-choice options each. Index of correct answer (0-3).
- Explanation: why the correct answer is correct, 1-2 sentences. Connect explicitly to the bridge competency.
- Bloom level matches the module's stated level — questions test the COGNITIVE OPERATION, not just recall.

PROJECT BRIEF — exactly 1:
- Produces a TANGIBLE artifact a learner could show in the target career's portfolio (UX → Figma file, design system page, audit doc; software → GitHub repo, deployed app; etc.)
- Specific enough that two people doing it would produce comparable outputs
- 2-6 estimated hours
- Always a portfolio-quality output the learner can show TARGET-CAREER employers

LENGTH BUDGET (strict): Keep total output under 1200 tokens. Trim explanation strings to 1-2 short sentences. Trim project brief to 2 sentences. Limit deliverables and skillsDemonstrated to 3 items each. NO markdown wrapping. NO leading prose. Output starts with { and ends with }.

Return ONLY valid JSON. The TOP-LEVEL keys MUST be exactly "quiz" (an ARRAY with 3 items) and "project" (an OBJECT). Nothing else at the top level. NO wrapper key. NO markdown code fences.

{
  "quiz": [
    { "q": "<scenario question>", "options": ["<A>", "<B>", "<C>", "<D>"], "correct": 0, "explanation": "<1-2 short sentences>" },
    { "q": "<scenario question>", "options": ["<A>", "<B>", "<C>", "<D>"], "correct": 0, "explanation": "<1-2 short sentences>" },
    { "q": "<scenario question>", "options": ["<A>", "<B>", "<C>", "<D>"], "correct": 0, "explanation": "<1-2 short sentences>" }
  ],
  "project": {
    "title": "<short title>",
    "brief": "<2 sentences max>",
    "deliverables": ["<item>", "<item>", "<item>"],
    "skillsDemonstrated": ["<skill>", "<skill>", "<skill>"],
    "estimatedHours": 4,
    "isPortfolioArtifact": true
  }
}`;

export async function runAssessmentAgent(
  anthropic: Anthropic,
  skillDiff: SkillDiffResult,
): Promise<AssessmentResult> {
  const prompt = `Build the assessment for a learner pivoting from ${skillDiff.current.title} to ${skillDiff.target.title}.

Primary bridge competency: ${skillDiff.headline.primaryBridge.name} (${skillDiff.headline.primaryBridgeType})
Module topic: ${skillDiff.headline.moduleTopic}
Bloom level: ${skillDiff.headline.bloomLevel}
Estimated hours for the module: ${skillDiff.headline.estimatedHours}

What they already bring: ${skillDiff.diff.sharedKnowledge.slice(0, 3).map((c) => c.name).join(", ") || "(general workplace skills)"}.

Return only JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsedRaw = parseAgentJson<Record<string, unknown>>(text, "Assessment Agent");

  // Defensive coercion: Haiku occasionally returns the right data nested under
  // a wrapper key, or with quiz as an object instead of array. Try to recover
  // before we give up and return the stub.
  function coerceQuiz(input: unknown): unknown[] | null {
    if (Array.isArray(input)) return input;
    // Common bad shape: object with numeric keys or "0", "1", "2" string keys
    if (input && typeof input === "object") {
      const values = Object.values(input as Record<string, unknown>);
      if (values.length > 0 && values.every((v) => v && typeof v === "object")) {
        return values;
      }
    }
    return null;
  }
  function coerceProject(input: unknown): Record<string, unknown> | null {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      return input as Record<string, unknown>;
    }
    return null;
  }

  // Try direct shape first. If wrapped (e.g., { assessment: { quiz, project } }),
  // unwrap and retry one level deep.
  let quiz = coerceQuiz(parsedRaw.quiz);
  let project = coerceProject(parsedRaw.project);
  if ((!quiz || !project) && typeof parsedRaw === "object") {
    for (const v of Object.values(parsedRaw)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = v as Record<string, unknown>;
        if (!quiz) quiz = coerceQuiz(inner.quiz);
        if (!project) project = coerceProject(inner.project);
        if (quiz && project) break;
      }
    }
  }

  if (!quiz || !project) {
    console.warn(
      "[assessment] malformed JSON shape after coercion, returning empty stub. Bad output:",
      text.slice(0, 500),
    );
    return {
      quiz: [],
      project: {
        title: "Project brief unavailable",
        brief:
          "The assessment agent returned malformed output. The other module sections still render correctly.",
        deliverables: [],
        skillsDemonstrated: [],
        estimatedHours: 0,
        isPortfolioArtifact: false,
      },
    };
  }
  return {
    quiz: quiz.map((q: any) => ({
      q: String(q.q ?? ""),
      options: Array.isArray(q.options) ? q.options.map((o: unknown) => String(o)) : [],
      correct: Number.isInteger(q.correct) ? q.correct : 0,
      explanation: String(q.explanation ?? ""),
    })),
    project: {
      title: String(project.title ?? ""),
      brief: String(project.brief ?? ""),
      deliverables: Array.isArray(project.deliverables)
        ? project.deliverables.map((d: unknown) => String(d))
        : [],
      skillsDemonstrated: Array.isArray(project.skillsDemonstrated)
        ? project.skillsDemonstrated.map((s: unknown) => String(s))
        : [],
      estimatedHours:
        typeof project.estimatedHours === "number" ? project.estimatedHours : 4,
      isPortfolioArtifact: project.isPortfolioArtifact !== false,
    },
  };
}

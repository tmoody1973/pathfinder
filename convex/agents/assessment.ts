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

Two outputs:

QUIZ — exactly 3 questions:
- Each is a SCENARIO question (situate the learner in a realistic situation).
- 4 multiple-choice options each. Index of correct answer (0-3).
- Explanation: why the correct answer is correct, 1-2 sentences. Connect to the bridge competency.
- Bloom level matches the module's stated level (Apply / Analyze etc.) — questions test the COGNITIVE OPERATION, not just recall.

PROJECT BRIEF — exactly 1:
- Produces a TANGIBLE artifact that demonstrates the bridge competency
- Specific enough that two people doing it would produce comparable outputs
- 2-6 estimated hours
- Always a portfolio-quality output the learner can show employers

Return ONLY valid JSON with this exact shape:
{
  "quiz": [
    { "q": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." },
    ...3 total
  ],
  "project": {
    "title": "...",
    "brief": "<2-3 sentence project description>",
    "deliverables": ["...", "..."],
    "skillsDemonstrated": ["...", "..."],
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
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseAgentJson<{ quiz?: unknown[]; project?: Record<string, unknown> }>(
    text,
    "Assessment Agent",
  );

  if (!Array.isArray(parsed.quiz) || typeof parsed.project !== "object" || parsed.project === null) {
    throw new Error("Assessment Agent: malformed JSON shape");
  }

  const project = parsed.project;

  return {
    quiz: parsed.quiz.map((q: any) => ({
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

/**
 * AI Career Counselor — Sonnet 4.6, with full path context.
 *
 * The counselor IS the conversational layer over the structured path. It
 * can refine an existing path ("is this realistic at my age?"), discover
 * careers from interests ("I like research and pattern-finding — what jobs?"),
 * answer credential ROI questions, and negotiate scope.
 *
 * Why Sonnet not Haiku: counselor responses need actual judgment and
 * uncertainty calibration. Haiku confabulates more confidently than Sonnet
 * does, which is dangerous for career advice. ~3x cost is justified.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface CounselorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CounselorContext {
  currentCareer: string;
  targetCareer: string;
  city?: string;
  hoursPerWeek?: number;
  profileText?: string;
  interests?: string;
  bridge?: {
    primaryBridge: string;
    framing: string;
    moduleTopic: string;
  };
  pathOutline?: {
    totalWeeks: number;
    totalHours: number;
    phases: Array<{
      title: string;
      modules: Array<{ number: number; title: string; estimatedHours: number }>;
    }>;
  };
  salary?: {
    currentMedian?: number;
    targetMedian?: number;
    currentRange?: string;
    targetRange?: string;
  };
}

const SYSTEM_PROMPT_BASE = `You are PathFinder's AI Career Counselor. You give honest, evidence-grounded career advice to people who are mid-career and considering a transition. Your voice is direct, warm, and practical — like a senior peer who has done this transition themselves and wants to save the person time.

CORE PRINCIPLES:
- Honesty over flattery. If a transition is genuinely hard at the user's age/constraints, say so plainly. If their résumé shows them closer to the target than they realize, name that too.
- Specifics over abstractions. "9 years of contract review IS structured stakeholder interviewing" beats "you have transferable skills."
- Numbers when they matter. Salary, hours, breakeven, time-to-first-interview — give ranges, not single points. Cite training-time BLS data and acknowledge when location-specific data would refine the answer.
- Calibrated uncertainty. "Most people in this transition take 9-15 months" — never "you'll land a job in 6 months."
- Anti-imposter framing. Mid-career pivoters are not blank-slate beginners. Treat their existing experience as the asset it is.
- The audit-only trap. When discussing Coursera/edX, name the audit-vs-cert distinction explicitly. Don't let the user assume "free audit = free credential."

WHAT YOU DON'T DO:
- Inspire. The user explicitly does not need pep talks ("I don't need inspiration. I need to know if this is going to work.").
- Recommend bootcamps over $10K without strong financial justification.
- Promise outcomes. Career transitions are probabilistic.
- Hide trade-offs. If a 6-month timeline is impossible at 4 hours/week, say "9 months realistic, 12 honest."

INTERACTION SHAPE:
- Keep responses conversational length, not essay length. 2-4 short paragraphs typical.
- When the user asks an open question ("what should I do?"), ask 1-2 clarifying questions before answering — but only when genuinely needed. Don't stall.
- When the user asks a closed question ("is the Google UX cert worth $354?"), answer directly with the trade-off.
- When the user describes interests ("I like X, Y, Z"), name 3-5 careers that match, ranked by fit, with one-sentence why for each. Then ask which one resonates so you can dig in.
- Reference the user's actual context. You have their current career, target career, hours/week, city, profile, path outline, and salary data. Use them.

You are NOT just a chatbot. You are an embedded counselor inside a working career-bridge platform. Treat the user's path as live context, not background reading.`;

function buildContextBlock(ctx: CounselorContext): string {
  const lines: string[] = [];
  lines.push(`USER CONTEXT (always reference when relevant):`);
  lines.push(`- Current career: ${ctx.currentCareer}`);
  lines.push(`- Target career: ${ctx.targetCareer}`);
  if (ctx.city) lines.push(`- City: ${ctx.city}`);
  if (typeof ctx.hoursPerWeek === "number")
    lines.push(`- Hours/week available: ${ctx.hoursPerWeek}`);
  if (ctx.profileText)
    lines.push(`- Profile (LinkedIn/résumé):\n  """\n${ctx.profileText.slice(0, 4000)}\n  """`);
  if (ctx.interests)
    lines.push(
      `- What they actually enjoy (their words):\n  """\n${ctx.interests.slice(0, 1500)}\n  """\n  When their answer connects to their interests, name the interest. Don't be generic about it.`,
    );
  if (ctx.bridge) {
    lines.push(`- Primary bridge competency: ${ctx.bridge.primaryBridge}`);
    lines.push(`- Module topic: ${ctx.bridge.moduleTopic}`);
    lines.push(`- Framing already shown: "${ctx.bridge.framing}"`);
  }
  if (ctx.pathOutline) {
    lines.push(
      `- Path: ${ctx.pathOutline.totalWeeks} weeks, ${ctx.pathOutline.totalHours}h, ${ctx.pathOutline.phases.length} phases:`,
    );
    for (const phase of ctx.pathOutline.phases) {
      const moduleNames = phase.modules
        .map((m) => `M${m.number} ${m.title} (${m.estimatedHours}h)`)
        .join("; ");
      lines.push(`    ${phase.title} — ${moduleNames}`);
    }
  }
  if (ctx.salary?.currentMedian || ctx.salary?.targetMedian) {
    lines.push(
      `- Salary baseline: ${ctx.currentCareer} ~$${ctx.salary.currentMedian ?? "?"} (${ctx.salary.currentRange ?? "?"}) → ${ctx.targetCareer} ~$${ctx.salary.targetMedian ?? "?"} (${ctx.salary.targetRange ?? "?"})`,
    );
  }
  return lines.join("\n");
}

/**
 * Send the user's message to the counselor with full path context.
 * Returns the assistant's response. Streaming is set up but the function
 * returns once the full response is collected — caller decides whether to
 * stream to UI or wait for the full text.
 */
export async function askCounselor(
  anthropic: Anthropic,
  context: CounselorContext,
  history: CounselorMessage[],
  userMessage: string,
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${buildContextBlock(context)}`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Streaming variant — Sonnet emits tokens as it generates them. The caller
 * provides an `onProgress` callback that gets the cumulative text so far
 * (not deltas), throttled by the caller's choice. Returns the final full text.
 *
 * Why cumulative text instead of deltas: the counselor.ts action patches a
 * Convex doc with the running content, and patches need the FULL text each
 * time (Convex doesn't have appender mutations for strings). Pushing the
 * accumulator through saves one .join() per flush in the caller.
 */
export async function askCounselorStreaming(
  anthropic: Anthropic,
  context: CounselorContext,
  history: CounselorMessage[],
  userMessage: string,
  onProgress: (cumulativeText: string) => Promise<void> | void,
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${buildContextBlock(context)}`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  });

  let accumulator = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      accumulator += event.delta.text;
      // Caller throttles. We invoke on every delta so the caller's clock
      // drives flush cadence, not the model's emission rate.
      await onProgress(accumulator);
    }
  }

  return accumulator;
}

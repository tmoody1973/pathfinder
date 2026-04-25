"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { askCounselor, type CounselorContext, type CounselorMessage } from "./agents/counselor";

/**
 * Public action: ask the counselor a question. Persists the user message,
 * fetches full path context (path + featured module skillDiff + salary),
 * calls Sonnet, persists the response.
 *
 * UI subscribes via api.counselorMessages.listMessages — Convex live queries
 * deliver the user message + assistant reply as soon as each lands in the DB,
 * giving a streaming-feeling UX without true token streaming.
 */
export const ask = action({
  args: {
    pathId: v.id("paths"),
    message: v.string(),
  },
  handler: async (ctx, { pathId, message }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return { ok: false, error: "Empty message" };
    if (trimmed.length > 4000) return { ok: false, error: "Message too long (max 4000 chars)" };

    // Persist the user message immediately so the UI shows it
    await ctx.runMutation(internal.counselorMessages.appendMessage, {
      pathId,
      role: "user",
      content: trimmed,
    });

    try {
      const path = await ctx.runQuery(api.paths.get, { pathId });
      if (!path) return { ok: false, error: "Path not found" };

      const featured = await ctx.runQuery(api.modules.getForPath, { pathId });
      const skillDiff: any = featured?.careerDiff;
      const salary: any = featured?.salary;

      const context: CounselorContext = {
        currentCareer: path.currentCareer,
        targetCareer: path.targetCareer,
        city: path.city ?? undefined,
        hoursPerWeek: path.hoursPerWeek ?? undefined,
        profileText: path.profileText ?? undefined,
        bridge: skillDiff?.headline
          ? {
              primaryBridge: String(skillDiff.headline.primaryBridge?.name ?? ""),
              framing: String(skillDiff.headline.framing ?? ""),
              moduleTopic: String(skillDiff.headline.moduleTopic ?? ""),
            }
          : undefined,
        pathOutline: path.pathOutline
          ? {
              totalWeeks: Number(path.pathOutline.totalWeeks ?? 8),
              totalHours: Number(path.pathOutline.totalHours ?? 30),
              phases: (path.pathOutline.phases ?? []).map((p: any) => ({
                title: String(p.title ?? ""),
                modules: (p.modules ?? []).map((m: any) => ({
                  number: Number(m.number),
                  title: String(m.title ?? ""),
                  estimatedHours: Number(m.estimatedHours ?? 0),
                })),
              })),
            }
          : undefined,
        salary: salary
          ? {
              currentMedian: salary.current?.medianAnnual,
              targetMedian: salary.target?.medianAnnual,
              currentRange: salary.current?.range,
              targetRange: salary.target?.range,
            }
          : undefined,
      };

      // Get conversation history WITHOUT the message we just appended
      const allMessages = await ctx.runQuery(api.counselorMessages.listMessages, { pathId });
      const history: CounselorMessage[] = allMessages
        .slice(0, -1) // drop the user message we just appended
        .map((m) => ({ role: m.role, content: m.content }));

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const reply = await askCounselor(anthropic, context, history, trimmed);

      await ctx.runMutation(internal.counselorMessages.appendMessage, {
        pathId,
        role: "assistant",
        content: reply,
      });

      return { ok: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[counselor.ask] failed:", errorMessage);
      await ctx.runMutation(internal.counselorMessages.appendMessage, {
        pathId,
        role: "assistant",
        content: `Sorry, I hit an error: ${errorMessage}. Please try again.`,
      });
      return { ok: false, error: errorMessage };
    }
  },
});

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import {
  resolveTargetCareer,
  type TargetResolverOutput,
} from "./agents/targetResolver";

/**
 * Public action: suggest 3 target careers based on a profile + optional interests.
 *
 * Stateless — does not persist anything. Frontend calls this from the home-page
 * "Not sure?" modal, displays the 3 cards, then on click fills the target
 * career field and submits the existing createPath mutation. So discovery is
 * a precursor to the bridge pipeline, not a separate flow.
 *
 * Sonnet 4.6, ~6-10s typical. No rate limit here — the rate limit lives on
 * createPath where it actually matters (path generation cost, not suggestion cost).
 */
export const suggestCareers = action({
  args: {
    profileText: v.string(),
    interests: v.optional(v.string()),
    currentCareer: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<
    | { ok: true; result: TargetResolverOutput }
    | { ok: false; error: string }
  > => {
    const profile = args.profileText.trim();
    if (profile.length === 0) {
      return { ok: false, error: "Paste your LinkedIn About + Experience or a résumé to get suggestions." };
    }
    if (profile.length < 80) {
      return {
        ok: false,
        error:
          "That's pretty thin — paste at least your About + most recent role for a useful read.",
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Server not configured (missing ANTHROPIC_API_KEY)." };
    }

    try {
      const anthropic = new Anthropic({ apiKey });
      const result = await resolveTargetCareer(anthropic, {
        profileText: profile,
        interests: args.interests?.trim() || undefined,
        currentCareer: args.currentCareer?.trim() || undefined,
      });

      if (result.suggestions.length === 0) {
        return {
          ok: false,
          error: "Couldn't generate suggestions from that input. Try adding more detail.",
        };
      }

      return { ok: true, result };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[discover.suggestCareers] failed:", errorMessage);
      return { ok: false, error: errorMessage };
    }
  },
});

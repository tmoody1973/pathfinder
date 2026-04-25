"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Voice synthesis — ElevenLabs TTS.
 *
 * Called fire-and-forget by counselor.ask after the streaming response from
 * Sonnet completes. Synthesizes the assistant's full reply, stores the audio
 * in Convex file storage, then patches the message row with the URL. The
 * counselor UI subscribes to the message and auto-plays the audio when the
 * URL arrives.
 *
 * Voice: Adam (calm, measured male), matches the "honest peer" framing of
 * the counselor system prompt. Model: eleven_turbo_v2_5 (fastest, ~1-2s for
 * a 200-word response).
 *
 * Cost: ~$0.30 per 1000 chars at the basic tier. A typical 500-word counselor
 * response is ~3000 chars = ~$0.90. Acceptable for demo, expensive at scale.
 * Caller should gate on a user voice-mode toggle.
 *
 * Silent fail policy: if ELEVENLABS_API_KEY isn't set OR the API errors, we
 * log and return without throwing. Text response still rendered, no audio.
 */

// Voice selection: ELEVENLABS_VOICE_ID env var (set in Convex) wins. Falls
// back to Adam (the public default) if unset. Lets the project owner swap
// voices without a code change.
const FALLBACK_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

// Token-budget guard: don't synthesize empty messages or absurdly long ones
const MIN_CHARS = 20;
const MAX_CHARS = 3000;

export const synthesize = internalAction({
  args: {
    text: v.string(),
    messageId: v.id("counselorMessages"),
  },
  handler: async (ctx, { text, messageId }): Promise<void> => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      console.log(`[voice.synthesize] skipping — too short (${trimmed.length} chars)`);
      return;
    }
    const synthInput = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.log("[voice.synthesize] skipping — ELEVENLABS_API_KEY not set");
      return;
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || FALLBACK_VOICE_ID;

    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: synthInput,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "<no body>");
        console.error(
          `[voice.synthesize] ElevenLabs error ${response.status}: ${body.slice(0, 300)}`,
        );
        return;
      }

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const storageId = await ctx.storage.store(blob);
      const audioUrl = await ctx.storage.getUrl(storageId);
      if (!audioUrl) {
        console.error("[voice.synthesize] storage.getUrl returned null");
        return;
      }

      await ctx.runMutation(internal.counselorMessages.updateMessageAudio, {
        messageId,
        audioUrl,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[voice.synthesize] failed:", errorMessage);
    }
  },
});

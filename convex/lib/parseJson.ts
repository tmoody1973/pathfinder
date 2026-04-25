import { jsonrepair } from "jsonrepair";

/**
 * Robust JSON parser for LLM outputs.
 *
 * LLMs occasionally produce JSON with: trailing commas, single quotes,
 * unescaped quotes inside strings, missing quotes around keys, comments,
 * or extra prose around the JSON. `jsonrepair` fixes all of those before
 * we hand to JSON.parse.
 *
 * Strategy:
 *   1. Strict JSON.parse on the trimmed input — fast path for correct output
 *   2. Try to extract a JSON-shaped substring (first '{' to last '}'),
 *      then run jsonrepair before parse
 *   3. Throw with the agent label and a clipped sample if all else fails
 */
export function parseAgentJson<T = unknown>(text: string, agentLabel: string): T {
  const trimmed = text.trim();

  // Fast path: clean JSON
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // fall through to repair
  }

  // Extract JSON-looking substring (greedy: first { to last })
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(`${agentLabel}: no JSON object in response: ${trimmed.slice(0, 200)}`);
  }
  const candidate = trimmed.slice(firstBrace, lastBrace + 1);

  try {
    const repaired = jsonrepair(candidate);
    return JSON.parse(repaired) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${agentLabel}: JSON parse failed after repair: ${message}. ` +
        `Sample: ${candidate.slice(0, 300)}...`,
    );
  }
}

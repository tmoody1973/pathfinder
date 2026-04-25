/**
 * Perplexity Sonar API wrapper.
 *
 * Sonar does real-time web search + synthesis with cited sources. Unlike
 * Claude, Sonar's responses are grounded in retrieved web documents — ideal
 * for "what's happening NOW" queries where freshness + real URLs matter.
 *
 * Models:
 *   sonar        — fast, basic web-grounded synthesis (~$1/M input)
 *   sonar-pro    — more reasoning, deeper search (~$3/M input)
 *   sonar-reasoning — chain-of-thought with citations (~$1/M input)
 *
 * Docs: https://docs.perplexity.ai/
 */

export interface SonarCitation {
  url: string;
}

export interface SonarResponse {
  content: string;           // the synthesized answer text
  citations: string[];       // URLs in retrieval order — index into them to cite
  searchResults?: Array<{    // some models return this
    title?: string;
    url?: string;
  }>;
}

export interface SonarMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type SonarModel = "sonar" | "sonar-pro" | "sonar-reasoning";

/**
 * Call Perplexity Sonar and return the synthesized content plus citations.
 * Throws on non-2xx or missing keys.
 */
export async function askSonar(
  messages: SonarMessage[],
  options: {
    model?: SonarModel;
    maxTokens?: number;
    temperature?: number;
    searchRecency?: "day" | "week" | "month" | "year";
  } = {},
): Promise<SonarResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY is not set. Run `bunx convex env set PERPLEXITY_API_KEY <key>`.",
    );
  }

  const body: Record<string, unknown> = {
    model: options.model ?? "sonar",
    messages,
    max_tokens: options.maxTokens ?? 1200,
    temperature: options.temperature ?? 0.2,
    return_citations: true,
  };
  if (options.searchRecency) {
    body.search_recency_filter = options.searchRecency;
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Perplexity Sonar ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = Array.isArray(data?.citations) ? data.citations : [];
  const searchResults = Array.isArray(data?.search_results)
    ? data.search_results.map((r: any) => ({ title: r.title, url: r.url }))
    : undefined;

  return { content, citations, searchResults };
}

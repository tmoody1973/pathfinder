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

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

/**
 * Raw Perplexity /search endpoint — returns ranked real web results, NOT a
 * synthesized paragraph. Use this when you want real URLs + titles + snippets
 * to feed into another LLM for processing (e.g. News Agent uses this to avoid
 * hallucinated news items, then Haiku adds the editorial layer).
 *
 * Docs: https://docs.perplexity.ai/docs/search/quickstart
 */
export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    domainFilter?: string[];
    country?: string;
  } = {},
): Promise<SearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY is not set. Run `bunx convex env set PERPLEXITY_API_KEY <key>`.",
    );
  }

  // Note: /search supports max_results (1-20), search_domain_filter (up to 20
  // domains, "-" prefix for denylist), search_language_filter, country. It
  // does NOT support search_recency_filter — that's only on /chat/completions.
  // For recency bias, put the year in the query string and let the default
  // ranker surface recent results.
  const body: Record<string, unknown> = {
    query,
    max_results: Math.max(1, Math.min(20, options.maxResults ?? 10)),
  };
  if (options.country) body.country = options.country;
  if (options.domainFilter && options.domainFilter.length > 0) {
    body.search_domain_filter = options.domainFilter;
  }

  const res = await fetch("https://api.perplexity.ai/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Perplexity /search ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  // Perplexity /search returns an array of results under `results` or `data.results`.
  // Normalize across shape variants.
  const rawResults = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.data?.results)
      ? data.data.results
      : Array.isArray(data)
        ? data
        : [];

  return rawResults
    .map((r: any): SearchResult | null => {
      const url = String(r?.url ?? r?.link ?? "").trim();
      const title = String(r?.title ?? r?.name ?? "").trim();
      if (!url || !title) return null;
      return {
        url,
        title,
        snippet: typeof r?.snippet === "string"
          ? r.snippet
          : typeof r?.description === "string"
            ? r.description
            : typeof r?.content === "string"
              ? r.content
              : undefined,
        date: typeof r?.date === "string"
          ? r.date
          : typeof r?.published_at === "string"
            ? r.published_at
            : typeof r?.published_date === "string"
              ? r.published_date
              : undefined,
      };
    })
    .filter((r: SearchResult | null): r is SearchResult => r !== null);
}

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

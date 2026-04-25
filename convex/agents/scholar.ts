/**
 * Scholar Agent — SerpAPI Google Scholar.
 *
 * Pulls peer-reviewed papers relevant to the target career so the "About this
 * career" tab includes academic grounding. For research-adjacent careers (UX,
 * data science, ML, HCI, education research) this is rich. For trades and
 * creative roles, results are thin or empty — UI hides the section if so, no
 * embarrassment.
 *
 * Strategy:
 *   1. Compose a tight scholar query from the target career name + bridge
 *      topic. We anchor on the literal career phrase so we don't drown in
 *      adjacent fields.
 *   2. Call SerpAPI's google_scholar engine.
 *   3. Filter: drop entries with no citation count or fewer than 5 citations
 *      (Scholar's long tail is a junk yard). Keep top 5.
 *   4. Return shape that the UI can render straight to a list.
 *
 * Cost: SerpAPI is ~$0.01/search. One call per path. Trivial.
 */

export interface ScholarPaper {
  title: string;
  authors: string;          // "J. Smith, K. Johnson, ..."
  year: string;             // "2021" — string because Scholar isn't always clean
  citationCount: number;
  snippet: string;          // brief description from Scholar
  pdfLink?: string;         // direct PDF if available (sometimes empty)
  link: string;             // canonical Scholar / publisher page
  publicationInfo: string;  // venue summary, e.g. "Journal of HCI · 2021"
}

export interface ScholarResult {
  query: string;
  papers: ScholarPaper[];
  available: boolean;       // false when no key or no results — UI hides the section
}

/**
 * Construct the search query. We want the literal career name as an anchor
 * (matches the books/videos pattern), plus a research-flavored qualifier so
 * we pull empirical papers, not white papers and conference panels.
 */
function buildQuery(targetCareer: string, bridgeTopic?: string): string {
  const career = targetCareer.trim();
  if (bridgeTopic && bridgeTopic.trim().length > 0) {
    return `"${career}" ${bridgeTopic.trim()}`;
  }
  return `"${career}" research methods OR empirical study`;
}

interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  publication_info?: {
    summary?: string;
    authors?: Array<{ name?: string }>;
  };
  inline_links?: {
    cited_by?: { total?: number };
  };
  resources?: Array<{ link?: string; file_format?: string }>;
}

interface SerpApiScholarResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

/**
 * Parse a SerpAPI publication_info.summary string. Format varies; common shape:
 *   "J Smith, K Johnson - Journal Name, 2021 - publisher.com"
 * We pull authors (first segment), year (4-digit anywhere), and a venue blob.
 */
function parsePublicationInfo(info: string): { authors: string; year: string } {
  if (!info) return { authors: "", year: "" };
  // Authors: everything before the first " - "
  const dashIdx = info.indexOf(" - ");
  const authors = dashIdx > 0 ? info.slice(0, dashIdx).trim() : "";
  // Year: any 4-digit run starting with 19 or 20
  const yearMatch = info.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : "";
  return { authors, year };
}

export async function runScholarAgent(args: {
  targetCareer: string;
  bridgeTopic?: string;
}): Promise<ScholarResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.log("[scholar] skipping — SERPAPI_API_KEY not set");
    return { query: "", papers: [], available: false };
  }

  const query = buildQuery(args.targetCareer, args.bridgeTopic);
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_scholar");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "20");
  // hl=en for English results, scisbd=0 for relevance sort (default)
  url.searchParams.set("hl", "en");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[scholar] SerpAPI error ${response.status}: ${body.slice(0, 200)}`,
      );
      return { query, papers: [], available: false };
    }

    const data = (await response.json()) as SerpApiScholarResponse;
    if (data.error) {
      console.error("[scholar] SerpAPI returned error:", data.error);
      return { query, papers: [], available: false };
    }

    const organic = data.organic_results ?? [];

    const papers: ScholarPaper[] = organic
      .map((r): ScholarPaper | null => {
        const title = r.title?.trim();
        const link = r.link?.trim();
        if (!title || !link) return null;

        const summary = r.publication_info?.summary ?? "";
        const parsed = parsePublicationInfo(summary);
        // Prefer authors from the structured array if present
        const authorsArr = r.publication_info?.authors
          ?.map((a) => a.name?.trim())
          .filter((n): n is string => Boolean(n && n.length > 0));
        const authors =
          authorsArr && authorsArr.length > 0
            ? authorsArr.slice(0, 4).join(", ")
            : parsed.authors;

        const citationCount = r.inline_links?.cited_by?.total ?? 0;

        // Resources may include a direct PDF
        const pdfResource = r.resources?.find(
          (res) => res.file_format?.toUpperCase() === "PDF",
        );

        return {
          title,
          authors,
          year: parsed.year,
          citationCount,
          snippet: (r.snippet ?? "").trim(),
          pdfLink: pdfResource?.link,
          link,
          publicationInfo: summary,
        };
      })
      .filter((p): p is ScholarPaper => p !== null)
      // Drop the long tail of zero/low-citation entries — Scholar's bottom
      // of the result page is a junk yard.
      .filter((p) => p.citationCount >= 5)
      // Sort by citation count desc, then by year desc (recent + cited first)
      .sort((a, b) => {
        if (b.citationCount !== a.citationCount) {
          return b.citationCount - a.citationCount;
        }
        const ay = parseInt(a.year, 10) || 0;
        const by = parseInt(b.year, 10) || 0;
        return by - ay;
      })
      .slice(0, 5);

    return {
      query,
      papers,
      available: papers.length >= 1,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[scholar] failed:", errorMessage);
    return { query, papers: [], available: false };
  }
}

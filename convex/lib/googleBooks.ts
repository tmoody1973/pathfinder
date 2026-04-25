/**
 * Google Books API wrapper.
 *
 * Endpoint: https://www.googleapis.com/books/v1/volumes
 * Rate limit:
 *   - Without API key: 1,000 requests/day per IP (easy to hit during heavy
 *     hackathon testing — the Convex backend's outbound IP gets shared across
 *     all your path generations).
 *   - With API key (GOOGLE_BOOKS_API_KEY env var): 100,000 requests/day default
 *     on the free tier. Get a key: https://console.cloud.google.com/apis/credentials
 *     Enable Books API in Cloud Console first, then create an API key. Set
 *     via: bunx convex env set GOOGLE_BOOKS_API_KEY <key>
 *
 * Docs: https://developers.google.com/books/docs/v1/using
 */

export interface BookResult {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;          // may be truncated; can be long
  pageCount?: number;
  thumbnailUrl?: string;
  infoLink: string;              // Google Books page — canonical URL to share
  previewLink?: string;          // free preview (may be null for snippet-only)
  averageRating?: number;        // 0-5
  ratingsCount?: number;
  categories: string[];
}

/**
 * Search Google Books. Returns up to `maxResults` (max 40 per API call).
 * No API key required for public metadata.
 */
export async function searchBooks(
  query: string,
  maxResults: number = 10,
): Promise<BookResult[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(Math.min(maxResults, 40)));
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", "relevance");
  // Use API key when available — bumps free quota from 1K/day to 100K/day
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 429 = quota exceeded. Don't throw — return empty so the path still
    // renders (books tab shows the "no books" state, other tabs unaffected).
    if (res.status === 429) {
      console.warn(
        `[googleBooks] quota exceeded for query "${query.slice(0, 80)}". Set GOOGLE_BOOKS_API_KEY in Convex env to lift the limit.`,
      );
      return [];
    }
    throw new Error(`Google Books search failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();

  const items = data.items ?? [];
  return items.map((item: any): BookResult => {
    const info = item.volumeInfo ?? {};
    const thumbRaw: string | undefined = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
    // Upgrade to HTTPS — Google sometimes serves http:// links
    const thumbnailUrl = thumbRaw?.replace(/^http:\/\//, "https://");
    return {
      id: item.id,
      title: info.title ?? "Untitled",
      subtitle: info.subtitle,
      authors: info.authors ?? [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      pageCount: typeof info.pageCount === "number" ? info.pageCount : undefined,
      thumbnailUrl,
      infoLink: info.infoLink ?? `https://books.google.com/books?id=${item.id}`,
      previewLink: info.previewLink,
      averageRating: typeof info.averageRating === "number" ? info.averageRating : undefined,
      ratingsCount: typeof info.ratingsCount === "number" ? info.ratingsCount : undefined,
      categories: info.categories ?? [],
    };
  });
}

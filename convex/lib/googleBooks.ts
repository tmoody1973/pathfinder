/**
 * Google Books API wrapper — zero auth, zero API key, zero cost.
 *
 * Endpoint: https://www.googleapis.com/books/v1/volumes
 * Rate limit (no key): 1000 requests/day per IP. Plenty for a hackathon demo.
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

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
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

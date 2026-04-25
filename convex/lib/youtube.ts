/**
 * YouTube Data API v3 wrapper for PathFinder Blackathon
 *
 * MOVE THIS FILE to: convex/lib/youtube.ts (or wherever your Convex action helpers live)
 * once you scaffold the project.
 *
 * Behavior:
 *  - Round-robin across 3 API keys (each backed by a separate Google Cloud project)
 *  - Auto-rotates on quotaExceeded (403) errors and retries once on the next key
 *  - Quota cost: search.list = 100 units, videos.list = 1 unit per page
 *  - 30,000 units/day total across 3 keys = ~300 ranked searches/day
 */

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnailUrl: string;
}

interface YouTubeVideoDetails {
  videoId: string;
  duration: string; // ISO 8601, e.g. "PT8M14S"
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
}

export interface RankedYouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string; // human-readable e.g. "8:14"
  durationSeconds: number;
  viewCount: number;
  relevanceScore: number; // 0-100
  url: string; // https://youtube.com/watch?v=...
}

/**
 * Resolve keys lazily on first use. Convex statically loads this file at deploy
 * time before env vars are necessarily set, so we cannot throw at module init.
 * Validation happens the first time a function actually needs to make a call.
 */
function getYouTubeKeys(): string[] {
  const keys = [
    process.env.YOUTUBE_API_KEY_1,
    process.env.YOUTUBE_API_KEY_2,
    process.env.YOUTUBE_API_KEY_3,
  ].filter((k): k is string => typeof k === "string" && k.length > 0);
  if (keys.length === 0) {
    throw new Error(
      "No YouTube API keys configured. Convex actions don't read .env.local — " +
        "set keys via `bunx convex env set YOUTUBE_API_KEY_1 <key>` (and _2, _3) " +
        "or via the Convex dashboard.",
    );
  }
  return keys;
}

let ytCallIndex = 0;

/**
 * Call a YouTube API endpoint with automatic key rotation on quota exhaustion.
 * Tries each key in the rotation before giving up.
 */
async function ytFetch(path: string, params: Record<string, string>): Promise<any> {
  const keys = getYouTubeKeys(); // throws if no keys are configured
  const triedKeys = new Set<number>();
  let lastError: Error | null = null;

  while (triedKeys.size < keys.length) {
    const idx = ytCallIndex++ % keys.length;
    if (triedKeys.has(idx)) continue;
    triedKeys.add(idx);

    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("key", keys[idx]);

    const res = await fetch(url.toString());
    if (res.ok) return res.json();

    const errBody = await res.json().catch(() => ({}));
    const isQuota =
      res.status === 403 &&
      JSON.stringify(errBody).toLowerCase().includes("quota");

    lastError = new Error(
      `YouTube API ${path} failed: ${res.status} ${JSON.stringify(errBody)}`
    );

    if (!isQuota) throw lastError; // non-quota error: don't waste other keys
    // quota error: try next key
  }

  throw new Error(
    `All ${keys.length} YouTube API keys exhausted. Last error: ${lastError?.message}`
  );
}

/**
 * Search YouTube. Costs 100 quota units per call.
 * Returns up to maxResults videos (default 10, max 50).
 */
async function youtubeSearch(
  query: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> {
  const data = await ytFetch("search", {
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    maxResults: String(Math.min(maxResults, 50)),
    relevanceLanguage: "en",
    safeSearch: "moderate",
  });

  return (data.items ?? []).map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
    thumbnailUrl:
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      "",
  }));
}

/**
 * Get duration + view counts for a list of video IDs. Costs 1 quota unit per call (regardless of count).
 * YouTube allows up to 50 IDs per call.
 */
async function youtubeVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  if (videoIds.length === 0) return [];
  const data = await ytFetch("videos", {
    part: "contentDetails,statistics",
    id: videoIds.slice(0, 50).join(","),
  });

  return (data.items ?? []).map((item: any) => ({
    videoId: item.id,
    duration: item.contentDetails.duration,
    durationSeconds: parseISO8601Duration(item.contentDetails.duration),
    viewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
    likeCount: parseInt(item.statistics?.likeCount ?? "0", 10),
  }));
}

/**
 * Combined search + details + ranking.
 * Total quota cost: 101 units per call (1 search + 1 videos batch).
 *
 * Ranking heuristic for "good educational content":
 *   - Relevance position from search (YouTube's signal): 40%
 *   - View count log scale (proxy for popularity): 25%
 *   - Duration sweet spot 4-15 minutes: 20%
 *   - Title contains query terms: 15%
 *
 * Filters out: < 60s (Shorts), > 30min (lectures too long for module), 0 views.
 */
export async function searchAndRankVideos(
  query: string,
  options: { count?: number; minDuration?: number; maxDuration?: number } = {}
): Promise<RankedYouTubeVideo[]> {
  const { count = 5, minDuration = 60, maxDuration = 1800 } = options;

  const searchResults = await youtubeSearch(query, 25);
  if (searchResults.length === 0) return [];

  const details = await youtubeVideoDetails(
    searchResults.map((r) => r.videoId)
  );
  const detailsById = new Map(details.map((d) => [d.videoId, d]));

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const ranked = searchResults
    .map((sr, searchPosition) => {
      const det = detailsById.get(sr.videoId);
      if (!det) return null;
      if (det.durationSeconds < minDuration || det.durationSeconds > maxDuration)
        return null;
      if (det.viewCount === 0) return null;

      const relevanceFromPosition =
        ((25 - searchPosition) / 25) * 40;
      const viewScore =
        Math.min(Math.log10(det.viewCount + 1) / 7, 1) * 25;
      const sweetSpot =
        det.durationSeconds >= 240 && det.durationSeconds <= 900 ? 20 : 10;
      const titleLower = sr.title.toLowerCase();
      const titleMatch =
        (queryTerms.filter((t) => titleLower.includes(t)).length /
          Math.max(queryTerms.length, 1)) *
        15;

      const relevanceScore = Math.round(
        relevanceFromPosition + viewScore + sweetSpot + titleMatch
      );

      return {
        videoId: sr.videoId,
        title: sr.title,
        channelTitle: sr.channelTitle,
        thumbnailUrl: sr.thumbnailUrl,
        duration: formatDuration(det.durationSeconds),
        durationSeconds: det.durationSeconds,
        viewCount: det.viewCount,
        relevanceScore,
        url: `https://www.youtube.com/watch?v=${sr.videoId}`,
      };
    })
    .filter((v): v is RankedYouTubeVideo => v !== null)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, count);

  return ranked;
}

// === Helpers ===

function parseISO8601Duration(iso: string): number {
  // PT8M14S -> 494
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

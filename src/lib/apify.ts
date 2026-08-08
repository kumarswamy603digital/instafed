import type { IgAccount, IgVideo } from "./types";
import { mockSearchAccounts, mockVideosFor } from "./mock-data";

const APIFY_BASE = "https://api.apify.com/v2";

// When we want "all" videos we ask the actor for a very large number of
// results; real Instagram profiles have far fewer posts than this, so it
// effectively means "scrape everything".
const UNLIMITED_RESULTS = 1_000_000;

function getConfig() {
  const token = process.env.APIFY_TOKEN?.trim() || "";
  const actorId = process.env.APIFY_ACTOR_ID?.trim() || "apify~instagram-scraper";
  const searchLimit = Number(process.env.APIFY_SEARCH_LIMIT || "20") || 20;

  // videosLimit === 0 means "unlimited" (fetch every video). This is the
  // default. Users can set APIFY_VIDEOS_LIMIT to a positive number to cap it.
  const rawVideos = (process.env.APIFY_VIDEOS_LIMIT ?? "").trim().toLowerCase();
  let videosLimit = 0;
  if (rawVideos && rawVideos !== "0" && rawVideos !== "unlimited" && rawVideos !== "all") {
    const n = Number(rawVideos);
    videosLimit = Number.isFinite(n) && n > 0 ? n : 0;
  }

  const mock =
    process.env.MOCK_APIFY?.toLowerCase() === "true" || token.length === 0;
  return { token, actorId, searchLimit, videosLimit, mock };
}

/**
 * Run an Apify actor synchronously and return the produced dataset items.
 * Uses the run-sync-get-dataset-items endpoint so we get results in one call.
 */
async function runActor<T = any>(
  actorId: string,
  token: string,
  input: Record<string, unknown>,
): Promise<T[]> {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(
    token,
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    // Actors can take a while; disable Next.js fetch caching.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Apify actor "${actorId}" failed (${res.status} ${res.statusText}): ${text.slice(
        0,
        500,
      )}`,
    );
  }

  const data = (await res.json()) as T[];
  return Array.isArray(data) ? data : [];
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                              SEARCH ACCOUNTS                                */
/* -------------------------------------------------------------------------- */

function mapSearchItem(item: any): IgAccount | null {
  const username = firstString(item?.username, item?.userName, item?.ownerUsername);
  if (!username) return null;
  return {
    username,
    fullName: firstString(item?.fullName, item?.full_name, item?.name),
    profilePicUrl: firstString(
      item?.profilePicUrl,
      item?.profile_pic_url,
      item?.profilePicUrlHD,
      item?.profilePic,
    ),
    isVerified: Boolean(item?.verified ?? item?.isVerified ?? item?.is_verified),
    isPrivate: Boolean(item?.private ?? item?.isPrivate ?? item?.is_private),
    followersCount: toNumberOrNull(
      item?.followersCount ?? item?.followers ?? item?.edge_followed_by?.count,
    ),
  };
}

export async function searchAccounts(query: string): Promise<IgAccount[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];

  const { token, actorId, searchLimit, mock } = getConfig();
  if (mock) return mockSearchAccounts(q, searchLimit);

  const input = {
    search: q,
    searchType: "user",
    searchLimit,
    resultsType: "details",
    resultsLimit: 0,
  };

  const items = await runActor<any>(actorId, token, input);
  const accounts: IgAccount[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const acc = mapSearchItem(it);
    if (acc && !seen.has(acc.username)) {
      seen.add(acc.username);
      accounts.push(acc);
    }
  }
  return accounts;
}

/* -------------------------------------------------------------------------- */
/*                                GET VIDEOS                                   */
/* -------------------------------------------------------------------------- */

function isVideoPost(item: any): boolean {
  const type = firstString(item?.type, item?.__typename)?.toLowerCase() || "";
  if (type.includes("video")) return true;
  if (item?.isVideo === true || item?.is_video === true) return true;
  return Boolean(firstString(item?.videoUrl, item?.video_url));
}

function mapVideoItem(item: any): IgVideo | null {
  const shortCode = firstString(item?.shortCode, item?.shortcode, item?.code);
  const url =
    firstString(item?.url, item?.postUrl) ||
    (shortCode ? `https://www.instagram.com/p/${shortCode}/` : null);
  const id = firstString(item?.id, item?.pk, shortCode, url);
  if (!id) return null;

  return {
    id,
    shortCode: shortCode || id,
    url: url || `https://www.instagram.com/`,
    caption: firstString(item?.caption, item?.text, item?.title),
    thumbnailUrl: firstString(
      item?.displayUrl,
      item?.display_url,
      item?.thumbnailUrl,
      item?.imageUrl,
      item?.thumbnail_src,
    ),
    videoUrl: firstString(item?.videoUrl, item?.video_url, item?.videoUrlHD),
    likesCount: toNumberOrNull(item?.likesCount ?? item?.likes ?? item?.like_count),
    commentsCount: toNumberOrNull(
      item?.commentsCount ?? item?.comments ?? item?.comment_count,
    ),
    viewsCount: toNumberOrNull(
      item?.videoViewCount ??
        item?.videoPlayCount ??
        item?.viewsCount ??
        item?.views ??
        item?.video_view_count,
    ),
    durationSeconds: toNumberOrNull(
      item?.videoDuration ?? item?.duration ?? item?.video_duration,
    ),
    timestamp: firstString(item?.timestamp, item?.takenAt, item?.taken_at_timestamp),
  };
}

export async function getAccountVideos(username: string): Promise<IgVideo[]> {
  const uname = username.trim().replace(/^@/, "");
  if (!uname) return [];

  const { token, actorId, videosLimit, mock } = getConfig();
  // 0 => unlimited. Mock generates a sensible sample count when unlimited.
  if (mock) return mockVideosFor(uname, videosLimit > 0 ? videosLimit : 24);

  const input = {
    directUrls: [`https://www.instagram.com/${uname}/`],
    resultsType: "posts",
    resultsLimit: videosLimit > 0 ? videosLimit : UNLIMITED_RESULTS,
  };

  const items = await runActor<any>(actorId, token, input);

  const videos: IgVideo[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!isVideoPost(it)) continue;
    const v = mapVideoItem(it);
    if (v && !seen.has(v.id)) {
      seen.add(v.id);
      videos.push(v);
    }
  }

  // Newest first when timestamps are available.
  videos.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });

  return videos;
}

export function isMockMode(): boolean {
  return getConfig().mock;
}

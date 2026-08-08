import type { IgAccount, IgVideo } from "./types";

/**
 * Mock data used when APIFY_TOKEN is not set or MOCK_APIFY="true".
 * Lets you develop and demo the full UI flow without spending Apify credits.
 */

const SAMPLE_HANDLES = [
  "official",
  "photography",
  "travel",
  "daily",
  "world",
  "hq",
  "studio",
  "media",
];

export function mockSearchAccounts(query: string, limit: number): IgAccount[] {
  const base = query.toLowerCase().replace(/[^a-z0-9_.]/g, "") || "user";
  const accounts: IgAccount[] = SAMPLE_HANDLES.slice(0, Math.max(1, limit)).map(
    (suffix, i) => {
      const username = i === 0 ? base : `${base}_${suffix}`;
      return {
        username,
        fullName: `${capitalize(base)} ${capitalize(suffix)}`.trim(),
        profilePicUrl: `https://picsum.photos/seed/${encodeURIComponent(
          username,
        )}/150/150`,
        isVerified: i % 3 === 0,
        isPrivate: i % 5 === 0,
        followersCount: 5000 * (i + 1) + (base.length * 137),
      };
    },
  );
  return accounts;
}

export function mockVideosFor(username: string, limit: number): IgVideo[] {
  const count = Math.min(Math.max(6, limit), 24);
  const videos: IgVideo[] = [];
  for (let i = 0; i < count; i++) {
    const seed = `${username}-${i}`;
    const daysAgo = i * 3 + 1;
    const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
    videos.push({
      id: `${username}_${i}`,
      shortCode: `MOCK${i}${username.slice(0, 3)}`,
      url: `https://www.instagram.com/${username}/`,
      caption: `Sample reel #${i + 1} from @${username} — mock data for local development. #instafed #demo`,
      thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/360/640`,
      // Public sample MP4s that actually play in the browser.
      videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
      likesCount: 1200 + i * 337,
      commentsCount: 40 + i * 11,
      viewsCount: 15000 + i * 2113,
      durationSeconds: 10 + (i % 5) * 7,
      timestamp: ts,
    });
  }
  return videos;
}

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
];

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

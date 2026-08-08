import type { IgVideo } from "./types";
import * as apify from "./apify";
import { getAccountVideos as ytdlpGetAccountVideos, isYtDlpProvider } from "./ytdlp";

/** Which backend is used to fetch an account's videos. */
export function currentProvider(): "ytdlp" | "apify" {
  return isYtDlpProvider() ? "ytdlp" : "apify";
}

/** Fetch an account's videos/reels using the configured provider. */
export async function getAccountVideos(username: string): Promise<IgVideo[]> {
  if (isYtDlpProvider()) {
    return ytdlpGetAccountVideos(username);
  }
  return apify.getAccountVideos(username);
}

/** Whether the current provider is serving mock data. */
export function isMockMode(): boolean {
  // yt-dlp always hits the real network; only Apify has a mock fallback.
  return isYtDlpProvider() ? false : apify.isMockMode();
}

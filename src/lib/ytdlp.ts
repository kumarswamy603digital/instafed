import { spawn } from "node:child_process";
import type { IgVideo } from "./types";

/**
 * yt-dlp based Instagram provider.
 *
 * Requires yt-dlp installed on the host running the app, plus (almost always)
 * valid Instagram cookies. Configure via env:
 *   VIDEO_PROVIDER=ytdlp
 *   IG_COOKIES_PATH=./cookies.txt          (Netscape cookies.txt) OR
 *   IG_COOKIES_FROM_BROWSER=chrome         (chrome|firefox|edge|brave|...)
 *   YTDLP_PATH=yt-dlp                       (optional, custom binary path)
 *   YTDLP_VIDEOS_LIMIT=0                     (0 = all reels)
 */

function ytdlpBin(): string {
  return process.env.YTDLP_PATH?.trim() || "yt-dlp";
}

export function isYtDlpProvider(): boolean {
  return (process.env.VIDEO_PROVIDER || "apify").toLowerCase() === "ytdlp";
}

function cookieArgs(): string[] {
  const path = process.env.IG_COOKIES_PATH?.trim();
  const browser = process.env.IG_COOKIES_FROM_BROWSER?.trim();
  if (path) return ["--cookies", path];
  if (browser) return ["--cookies-from-browser", browser];
  return [];
}

function videosLimit(): number {
  const raw = (process.env.YTDLP_VIDEOS_LIMIT ?? "").trim().toLowerCase();
  if (!raw || raw === "0" || raw === "all" || raw === "unlimited") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Run yt-dlp and resolve stdout, or reject with the last stderr line. */
function run(args: string[], timeoutMs = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytdlpBin(), args, { windowsHide: true });

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yt-dlp timed out"));
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Could not start yt-dlp (${e.message}). Install it and make sure it's on PATH.`,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(out);
      } else {
        const lastLine =
          err.trim().split("\n").filter(Boolean).pop() ||
          `yt-dlp exited with code ${code}`;
        reject(new Error(lastLine));
      }
    });
  });
}

function shortcodeFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = String(url).match(/\/(?:reel|reels|p|tv)\/([^/?#]+)/);
  return m ? m[1] : null;
}

function toIso(e: any): string | null {
  if (typeof e?.timestamp === "number") {
    return new Date(e.timestamp * 1000).toISOString();
  }
  if (typeof e?.upload_date === "string" && e.upload_date.length === 8) {
    const d = e.upload_date;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00.000Z`;
  }
  return null;
}

function mapEntry(e: any): IgVideo | null {
  const id = String(e?.id ?? e?.url ?? "").trim();
  if (!id) return null;

  const rawUrl = typeof e?.url === "string" ? e.url : "";
  const webpage = typeof e?.webpage_url === "string" ? e.webpage_url : "";
  const shortCode =
    shortcodeFromUrl(rawUrl) || shortcodeFromUrl(webpage) || null;

  const url =
    (rawUrl.startsWith("http") && rawUrl) ||
    (webpage.startsWith("http") && webpage) ||
    (shortCode
      ? `https://www.instagram.com/reel/${shortCode}/`
      : `https://www.instagram.com/reel/${id}/`);

  const thumbnails = Array.isArray(e?.thumbnails) ? e.thumbnails : [];
  const thumbnailUrl =
    e?.thumbnail ||
    (thumbnails.length ? thumbnails[thumbnails.length - 1]?.url : null) ||
    null;

  return {
    id,
    shortCode: shortCode || id,
    url,
    caption: e?.title || e?.description || null,
    thumbnailUrl,
    // Playback is resolved on demand and streamed through our server.
    videoUrl: `/api/stream?src=${encodeURIComponent(url)}`,
    likesCount: typeof e?.like_count === "number" ? e.like_count : null,
    commentsCount: typeof e?.comment_count === "number" ? e.comment_count : null,
    viewsCount:
      typeof e?.view_count === "number"
        ? e.view_count
        : typeof e?.play_count === "number"
        ? e.play_count
        : null,
    durationSeconds: typeof e?.duration === "number" ? e.duration : null,
    timestamp: toIso(e),
  };
}

/** List an account's reels (fast metadata via --flat-playlist). */
export async function getAccountVideos(username: string): Promise<IgVideo[]> {
  const uname = username.trim().replace(/^@/, "");
  if (!uname) return [];

  const url = `https://www.instagram.com/${uname}/reels/`;
  const limit = videosLimit();

  const args = [
    ...cookieArgs(),
    "--flat-playlist",
    "-J", // dump single JSON for the whole playlist
    "--no-warnings",
    ...(limit > 0 ? ["--playlist-end", String(limit)] : []),
    url,
  ];

  const stdout = await run(args);
  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch {
    return [];
  }

  const entries: any[] = Array.isArray(data?.entries)
    ? data.entries
    : data?.id
    ? [data]
    : [];

  const videos: IgVideo[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const v = mapEntry(e);
    if (v && !seen.has(v.id)) {
      seen.add(v.id);
      videos.push(v);
    }
  }
  return videos;
}

/** Resolve the direct media URL for a single reel (used by /api/stream). */
export async function resolveDirectUrl(reelUrl: string): Promise<string | null> {
  const args = [
    ...cookieArgs(),
    "-f",
    "best[ext=mp4]/best",
    "-g",
    "--no-warnings",
    reelUrl,
  ];
  const out = await run(args, 60000);
  const url = out.trim().split("\n").filter(Boolean).pop();
  return url && url.startsWith("http") ? url : null;
}

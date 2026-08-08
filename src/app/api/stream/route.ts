import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveDirectUrl } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Short-lived cache of resolved direct URLs (they are time-limited anyway).
const cache = new Map<string, { url: string; at: number }>();
const TTL_MS = 1000 * 60 * 3;

/**
 * Streams an Instagram reel through our server so it can play in-page.
 * ?src=<instagram reel url> -> yt-dlp resolves the direct media URL, then we
 * proxy it (forwarding Range headers) so seeking works and IG's referrer
 * restrictions don't block playback.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const src = searchParams.get("src");
  if (!src) return new NextResponse("Missing src", { status: 400 });

  try {
    const u = new URL(src);
    if (u.hostname !== "instagram.com" && !u.hostname.endsWith(".instagram.com")) {
      return new NextResponse("Host not allowed", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid src", { status: 400 });
  }

  // Resolve the direct media URL (cached briefly).
  let direct: string | null = null;
  const cached = cache.get(src);
  if (cached && Date.now() - cached.at < TTL_MS) {
    direct = cached.url;
  } else {
    try {
      direct = await resolveDirectUrl(src);
      if (direct) cache.set(src, { url: direct, at: Date.now() });
    } catch (err) {
      return new NextResponse(
        `Could not resolve video: ${err instanceof Error ? err.message : "error"}`,
        { status: 502 },
      );
    }
  }
  if (!direct) return new NextResponse("No playable media found", { status: 404 });

  // Proxy the media, forwarding Range for seeking.
  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(direct, {
      headers: range ? { Range: range } : {},
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "video/mp4",
  );
  headers.set("Accept-Ranges", "bytes");
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

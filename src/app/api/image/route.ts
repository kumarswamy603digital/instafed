import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Only proxy images from known Instagram / media CDNs to avoid an open proxy.
const ALLOWED_SUFFIXES = [
  "cdninstagram.com",
  "fbcdn.net",
  "instagram.com",
  "picsum.photos", // used by mock data
  "googleusercontent.com",
  "commondatastorage.googleapis.com",
];

function isAllowed(hostname: string): boolean {
  return ALLOWED_SUFFIXES.some(
    (s) => hostname === s || hostname.endsWith("." + s),
  );
}

/**
 * Image proxy. Instagram's CDN refuses to serve profile pics / thumbnails when
 * they're hot-linked from another origin. Fetching them server-side (no browser
 * referrer/CORS) and streaming them back from our own origin makes them load.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) {
    return new NextResponse("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new NextResponse("Unsupported protocol", { status: 400 });
  }
  if (!isAllowed(target.hostname)) {
    return new NextResponse("Host not allowed", { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache aggressively — profile pics rarely change.
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}

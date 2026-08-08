import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccountVideos, isMockMode } from "@/lib/apify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") || "").trim().replace(/^@/, "");
  if (!username) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

  // Only allow fetching videos for accounts the user has subscribed to.
  const sub = await prisma.subscription.findUnique({
    where: {
      userId_igUsername: { userId: session.user.id, igUsername: username },
    },
  });
  if (!sub) {
    return NextResponse.json(
      { error: "You are not subscribed to this account." },
      { status: 403 },
    );
  }

  try {
    const videos = await getAccountVideos(username);
    return NextResponse.json({
      videos,
      mock: isMockMode(),
      account: {
        username: sub.igUsername,
        fullName: sub.igFullName,
        profilePic: sub.igProfilePic,
        isVerified: sub.igIsVerified,
      },
    });
  } catch (err) {
    console.error("videos error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch videos." },
      { status: 502 },
    );
  }
}

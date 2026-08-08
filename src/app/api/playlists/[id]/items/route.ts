import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ownsPlaylist(userId: string, playlistId: string) {
  const pl = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
    select: { id: true },
  });
  return Boolean(pl);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await ownsPlaylist(session.user.id, params.id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const v = body?.video;
  const c = body?.channel;
  if (!v?.id || !c?.username) {
    return NextResponse.json(
      { error: "video and channel are required." },
      { status: 400 },
    );
  }

  const data = {
    playlistId: params.id,
    videoKey: String(v.id),
    shortCode: v.shortCode ?? null,
    url: String(v.url ?? ""),
    caption: v.caption ?? null,
    thumbnailUrl: v.thumbnailUrl ?? null,
    videoUrl: v.videoUrl ?? null,
    durationSeconds: v.durationSeconds ?? null,
    viewsCount: v.viewsCount ?? null,
    likesCount: v.likesCount ?? null,
    commentsCount: v.commentsCount ?? null,
    timestamp: v.timestamp ?? null,
    channelUsername: String(c.username),
    channelFullName: c.fullName ?? null,
    channelProfilePic: c.profilePic ?? null,
    channelIsVerified: Boolean(c.isVerified),
  };

  await prisma.playlistItem.upsert({
    where: {
      playlistId_videoKey: {
        playlistId: params.id,
        videoKey: String(v.id),
      },
    },
    update: data,
    create: data,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await ownsPlaylist(session.user.id, params.id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const videoKey = searchParams.get("videoKey");
  if (!videoKey) {
    return NextResponse.json({ error: "videoKey is required." }, { status: 400 });
  }

  await prisma.playlistItem.deleteMany({
    where: { playlistId: params.id, videoKey },
  });
  return NextResponse.json({ ok: true });
}

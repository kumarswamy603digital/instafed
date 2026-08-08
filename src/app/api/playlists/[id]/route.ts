import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await prisma.playlist.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
  if (!playlist) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      position: playlist.position,
      itemCount: playlist.items.length,
      covers: playlist.items
        .map((i) => i.thumbnailUrl)
        .filter((t): t is string => Boolean(t))
        .slice(0, 4),
      items: playlist.items.map((i) => ({
        id: i.id,
        videoKey: i.videoKey,
        shortCode: i.shortCode,
        url: i.url,
        caption: i.caption,
        thumbnailUrl: i.thumbnailUrl,
        videoUrl: i.videoUrl,
        durationSeconds: i.durationSeconds,
        viewsCount: i.viewsCount,
        likesCount: i.likesCount,
        commentsCount: i.commentsCount,
        timestamp: i.timestamp,
        channel: {
          username: i.channelUsername,
          fullName: i.channelFullName,
          profilePic: i.channelProfilePic,
          isVerified: i.channelIsVerified,
        },
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.playlist.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Playlist name cannot be empty." },
      { status: 400 },
    );
  }

  await prisma.playlist.update({
    where: { id: params.id },
    data: { name },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.playlist.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const videoKey = searchParams.get("videoKey");

  const playlists = await prisma.playlist.findMany({
    where: { userId: session.user.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      items: {
        orderBy: { addedAt: "desc" },
        select: { thumbnailUrl: true, videoKey: true },
      },
    },
  });

  const dto = playlists.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    itemCount: p.items.length,
    covers: p.items
      .map((i) => i.thumbnailUrl)
      .filter((t): t is string => Boolean(t))
      .slice(0, 4),
    hasVideo: videoKey
      ? p.items.some((i) => i.videoKey === videoKey)
      : undefined,
  }));

  return NextResponse.json({ playlists: dto });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Playlist name is required." },
      { status: 400 },
    );
  }

  const count = await prisma.playlist.count({
    where: { userId: session.user.id },
  });
  const playlist = await prisma.playlist.create({
    data: { userId: session.user.id, name, position: count },
  });

  return NextResponse.json(
    {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        position: playlist.position,
        itemCount: 0,
        covers: [],
      },
    },
    { status: 201 },
  );
}

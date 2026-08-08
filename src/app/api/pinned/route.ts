import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSnapshot, snapshotToDTO } from "@/lib/savedVideo";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.pinnedVideo.findMany({
    where: { userId: session.user.id },
    orderBy: { pinnedAt: "desc" },
  });

  return NextResponse.json({ items: rows.map(snapshotToDTO) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const snapshot = buildSnapshot(v, c);
  await prisma.pinnedVideo.upsert({
    where: {
      userId_videoKey: { userId: session.user.id, videoKey: String(v.id) },
    },
    update: snapshot,
    create: { ...snapshot, userId: session.user.id },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const videoKey = searchParams.get("videoKey");
  if (!videoKey) {
    return NextResponse.json({ error: "videoKey is required." }, { status: 400 });
  }

  await prisma.pinnedVideo.deleteMany({
    where: { userId: session.user.id, videoKey },
  });
  return NextResponse.json({ ok: true });
}

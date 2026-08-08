import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSnapshot, snapshotToDTO } from "@/lib/savedVideo";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 100;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.historyItem.findMany({
    where: { userId: session.user.id },
    orderBy: { watchedAt: "desc" },
    take: HISTORY_LIMIT,
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
    // History recording is best-effort — don't error the caller hard.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const snapshot = buildSnapshot(v, c);
  await prisma.historyItem.upsert({
    where: {
      userId_videoKey: { userId: session.user.id, videoKey: String(v.id) },
    },
    update: { ...snapshot, watchedAt: new Date() },
    create: { ...snapshot, userId: session.user.id },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.historyItem.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

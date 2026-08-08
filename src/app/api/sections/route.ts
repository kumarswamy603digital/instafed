import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SectionWithChannels = {
  id: string;
  name: string;
  position: number;
  channels: {
    subscriptionId: string;
    subscription: { igUsername: string } | null;
  }[];
};

function toDTO(s: SectionWithChannels) {
  return {
    id: s.id,
    name: s.name,
    position: s.position,
    subscriptionIds: s.channels.map((c) => c.subscriptionId),
    channelUsernames: s.channels
      .map((c) => c.subscription?.igUsername)
      .filter((u): u is string => Boolean(u)),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await prisma.section.findMany({
    where: { userId: session.user.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      channels: { include: { subscription: { select: { igUsername: true } } } },
    },
  });

  return NextResponse.json({ sections: sections.map(toDTO) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const subscriptionIds: string[] = Array.isArray(body?.subscriptionIds)
    ? body.subscriptionIds.map(String)
    : [];

  if (!name) {
    return NextResponse.json({ error: "Section name is required." }, { status: 400 });
  }

  // Only allow linking subscriptions the user actually owns.
  const owned = await prisma.subscription.findMany({
    where: { userId: session.user.id, id: { in: subscriptionIds } },
    select: { id: true },
  });

  const count = await prisma.section.count({ where: { userId: session.user.id } });

  const section = await prisma.section.create({
    data: {
      userId: session.user.id,
      name,
      position: count,
      channels: {
        create: owned.map((s) => ({ subscriptionId: s.id })),
      },
    },
    include: {
      channels: { include: { subscription: { select: { igUsername: true } } } },
    },
  });

  return NextResponse.json({ section: toDTO(section) }, { status: 201 });
}

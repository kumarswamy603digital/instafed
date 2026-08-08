import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toDTO(s: {
  id: string;
  name: string;
  position: number;
  channels: {
    subscriptionId: string;
    subscription: { igUsername: string } | null;
  }[];
}) {
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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.section.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const name =
    body?.name !== undefined ? String(body.name).trim() : undefined;
  const subscriptionIds: string[] | undefined = Array.isArray(
    body?.subscriptionIds,
  )
    ? body.subscriptionIds.map(String)
    : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json(
      { error: "Section name cannot be empty." },
      { status: 400 },
    );
  }

  // Replace channel membership if a new list was provided.
  if (subscriptionIds !== undefined) {
    const owned = await prisma.subscription.findMany({
      where: { userId: session.user.id, id: { in: subscriptionIds } },
      select: { id: true },
    });
    await prisma.sectionChannel.deleteMany({ where: { sectionId: params.id } });
    if (owned.length > 0) {
      await prisma.sectionChannel.createMany({
        data: owned.map((s) => ({ sectionId: params.id, subscriptionId: s.id })),
      });
    }
  }

  const updated = await prisma.section.update({
    where: { id: params.id },
    data: { ...(name !== undefined ? { name } : {}) },
    include: {
      channels: { include: { subscription: { select: { igUsername: true } } } },
    },
  });

  return NextResponse.json({ section: toDTO(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.section.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

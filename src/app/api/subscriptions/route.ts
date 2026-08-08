import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SubscriptionDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

function toDTO(s: {
  id: string;
  igUsername: string;
  igFullName: string | null;
  igProfilePic: string | null;
  igIsVerified: boolean;
  igIsPrivate: boolean;
  createdAt: Date;
}): SubscriptionDTO {
  return {
    id: s.id,
    igUsername: s.igUsername,
    igFullName: s.igFullName,
    igProfilePic: s.igProfilePic,
    igIsVerified: s.igIsVerified,
    igIsPrivate: s.igIsPrivate,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subscriptions: subs.map(toDTO) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const igUsername = String(body?.igUsername ?? "").trim().replace(/^@/, "");
  if (!igUsername) {
    return NextResponse.json(
      { error: "igUsername is required." },
      { status: 400 },
    );
  }

  try {
    const sub = await prisma.subscription.upsert({
      where: {
        userId_igUsername: { userId: session.user.id, igUsername },
      },
      update: {
        igFullName: body?.igFullName ?? null,
        igProfilePic: body?.igProfilePic ?? null,
        igIsVerified: Boolean(body?.igIsVerified),
        igIsPrivate: Boolean(body?.igIsPrivate),
      },
      create: {
        userId: session.user.id,
        igUsername,
        igFullName: body?.igFullName ?? null,
        igProfilePic: body?.igProfilePic ?? null,
        igIsVerified: Boolean(body?.igIsVerified),
        igIsPrivate: Boolean(body?.igIsPrivate),
      },
    });

    return NextResponse.json({ subscription: toDTO(sub) }, { status: 201 });
  } catch (err) {
    console.error("subscribe error", err);
    return NextResponse.json({ error: "Could not subscribe." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const name = body?.name ? String(body.name).trim() : null;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("register error", err);

    // Unique-constraint race (email created between check and insert).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Tables/columns don't exist yet — the database hasn't been set up.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2021" || err.code === "P2022")
    ) {
      return NextResponse.json(
        {
          error:
            "Database is not set up. Stop the server and run `npm run setup` (or `npx prisma db push`), then start it again with `npm run dev`.",
        },
        { status: 500 },
      );
    }

    // Cannot reach / open the database (bad DATABASE_URL, missing file, etc.).
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error:
            "Could not connect to the database. Check DATABASE_URL in your .env file, then run `npm run setup`.",
        },
        { status: 500 },
      );
    }

    // In development, surface the real message to make debugging painless.
    const detail =
      process.env.NODE_ENV !== "production" && err instanceof Error
        ? ` (${err.message})`
        : "";
    return NextResponse.json(
      { error: `Something went wrong creating your account.${detail}` },
      { status: 500 },
    );
  }
}

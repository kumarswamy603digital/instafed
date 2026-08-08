import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchAccounts, isMockMode } from "@/lib/apify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  if (!query) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  try {
    const accounts = await searchAccounts(query);
    return NextResponse.json({ accounts, mock: isMockMode() });
  } catch (err) {
    console.error("search error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 502 },
    );
  }
}

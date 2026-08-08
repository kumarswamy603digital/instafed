import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ocrImage } from "@/lib/ocr";

export const dynamic = "force-dynamic";
// OCR of a screenshot can take a few seconds.
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const imageBase64 = String(body?.imageBase64 ?? "");

  if (!imageBase64 || !/^data:image\/[a-zA-Z+]+;base64,/.test(imageBase64)) {
    return NextResponse.json(
      { error: "A base64 image data URL is required." },
      { status: 400 },
    );
  }

  try {
    const result = await ocrImage(imageBase64);
    return NextResponse.json(result);
  } catch (err) {
    console.error("ocr error", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not read text from the image.",
      },
      { status: 502 },
    );
  }
}

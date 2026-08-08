const OCR_URL = "https://api.ocr.space/parse/image";

export interface OcrResult {
  /** Raw text extracted from the image. */
  text: string;
  /** Best-guess account query (username or display name) to search with. */
  query: string | null;
  /** @handles found in the image, in reading order. */
  handles: string[];
  /** Name-like lines found in the image. */
  names: string[];
}

const STOP_LINE =
  /(followers|following|posts|message|follow|edit profile|professional dashboard|verified|suggested|www\.|https?:|\.com)/i;

function cleanHandle(h: string): string {
  return h.replace(/^[._]+|[._]+$/g, "");
}

/**
 * Parse raw OCR text from an Instagram profile screenshot into a best-guess
 * search query plus the candidate handles/names we found.
 */
export function parseOcrText(text: string): OcrResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const handleRe = /@([A-Za-z0-9._]{2,30})/g;
  const handles: string[] = [];
  for (const line of lines) {
    let m: RegExpExecArray | null;
    while ((m = handleRe.exec(line)) !== null) {
      const h = cleanHandle(m[1]);
      if (h && !handles.includes(h)) handles.push(h);
    }
  }

  // Name-like lines: contain letters, no leading @, not a stat/keyword line,
  // reasonably short, and not mostly digits.
  const names = lines.filter(
    (l) =>
      /[A-Za-z]/.test(l) &&
      !l.startsWith("@") &&
      !STOP_LINE.test(l) &&
      l.length <= 40 &&
      l.split(/\s+/).length <= 6 &&
      (l.match(/\d/g)?.length ?? 0) <= 2,
  );

  // A handle appearing near the top is very likely the profile username.
  const earlyText = lines.slice(0, 3).join(" ");
  const earlyMatch = earlyText.match(/@([A-Za-z0-9._]{2,30})/);
  const earlyHandle = earlyMatch ? cleanHandle(earlyMatch[1]) : null;

  const query = earlyHandle || names[0] || handles[0] || lines[0] || null;

  return { text, query, handles, names };
}

/**
 * Send a base64 data-URL image to OCR.space and return the parsed result.
 */
export async function ocrImage(base64DataUrl: string): Promise<OcrResult> {
  const apiKey = process.env.OCRSPACE_API_KEY?.trim() || "helloworld";

  const form = new URLSearchParams();
  form.set("base64Image", base64DataUrl);
  form.set("language", "eng");
  form.set("OCREngine", "2");
  form.set("scale", "true");
  form.set("detectOrientation", "true");

  const res = await fetch(OCR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: apiKey,
    },
    body: form.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OCR request failed (${res.status} ${res.statusText}).`);
  }

  const data = await res.json();

  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join("; ")
      : data.ErrorMessage || "OCR could not process the image.";
    throw new Error(String(msg));
  }

  const text: string = data?.ParsedResults?.[0]?.ParsedText || "";
  return parseOcrText(text);
}

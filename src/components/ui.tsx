"use client";

import { useState } from "react";

/** Circular avatar with graceful fallback to an initial when the image fails. */
export function Avatar({
  src,
  alt,
  size = 48,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const initial = alt?.charAt(0)?.toUpperCase() || "?";

  if (!src || errored) {
    return (
      <div
        className="rounded-full bg-instagram-gradient flex items-center justify-center font-bold text-white shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className="rounded-full object-cover shrink-0 bg-neutral-800"
      style={{ width: size, height: size }}
    />
  );
}

export function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-sky-400 shrink-0"
      fill="currentColor"
      aria-label="Verified"
    >
      <path d="M12 2l2.09 2.09 2.95-.36 1.02 2.79 2.79 1.02-.36 2.95L22 12l-2.09 2.09.36 2.95-2.79 1.02-1.02 2.79-2.95-.36L12 22l-2.09-2.09-2.95.36-1.02-2.79-2.79-1.02.36-2.95L2 12l2.09-2.09-.36-2.95 2.79-1.02L7.54 3.14l2.95.36L12 2zm-1.2 13.2l5.3-5.3-1.4-1.4-3.9 3.9-1.8-1.8-1.4 1.4 3.2 3.2z" />
    </svg>
  );
}

/** Simple centered spinner. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-neutral-400">
      <div className="w-8 h-8 border-2 border-neutral-700 border-t-brand rounded-full animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/** Small pill used to flag mock-data mode. */
export function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
      mock data
    </span>
  );
}

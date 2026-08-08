"use client";

import { useState } from "react";
import { proxied } from "@/lib/image";

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
  const imgSrc = proxied(src);

  if (!imgSrc || errored) {
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
      src={imgSrc}
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


/** Skeleton placeholder for an account card while searching. */
export function AccountCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-neutral-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/5 animate-pulse rounded bg-neutral-800" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-800/70" />
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-neutral-800/50" />
      </div>
      <div className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-neutral-800" />
    </div>
  );
}

/** Skeleton placeholder for a video tile while loading. */
export function VideoTileSkeleton() {
  return (
    <div className="aspect-[9/16] animate-pulse rounded-xl border border-neutral-800 bg-neutral-900" />
  );
}

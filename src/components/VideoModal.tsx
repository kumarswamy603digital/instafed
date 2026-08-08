"use client";

import { useEffect } from "react";
import type { IgVideo } from "@/lib/types";
import { formatCount, timeAgo } from "@/lib/format";

export function VideoModal({
  video,
  onClose,
}: {
  video: IgVideo;
  onClose: () => void;
}) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="bg-black aspect-[9/16] max-h-[70vh] flex items-center justify-center">
          {video.videoUrl ? (
            <video
              src={video.videoUrl}
              poster={video.thumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-neutral-400 p-6">
              <p>No playable video URL was returned for this post.</p>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-brand-light hover:underline"
              >
                Open on Instagram ↗
              </a>
            </div>
          )}
        </div>

        <div className="p-4">
          {video.caption && (
            <p className="text-sm text-neutral-200 whitespace-pre-wrap">
              {video.caption}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-neutral-400">
            {video.viewsCount !== null && (
              <span>▶ {formatCount(video.viewsCount)} views</span>
            )}
            {video.likesCount !== null && (
              <span>♥ {formatCount(video.likesCount)}</span>
            )}
            {video.commentsCount !== null && (
              <span>💬 {formatCount(video.commentsCount)}</span>
            )}
            {video.timestamp && (
              <span className="ml-auto">{timeAgo(video.timestamp)}</span>
            )}
          </div>
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-xs text-brand-light hover:underline"
          >
            View original on Instagram ↗
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { IgVideo } from "@/lib/types";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";

export function VideoCard({
  video,
  onOpen,
}: {
  video: IgVideo;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const duration = formatDuration(video.durationSeconds);

  return (
    <button
      onClick={onOpen}
      className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 text-left"
    >
      {video.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnailUrl}
          alt={video.caption || "video thumbnail"}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-instagram-gradient opacity-30" />
      )}

      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* play icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>

      {duration && (
        <span className="absolute top-2 right-2 text-[11px] font-medium bg-black/60 rounded px-1.5 py-0.5">
          {duration}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {video.caption && (
          <p className="text-xs text-neutral-200 line-clamp-2">{video.caption}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-300">
          {video.viewsCount !== null && <span>▶ {formatCount(video.viewsCount)}</span>}
          {video.likesCount !== null && <span>♥ {formatCount(video.likesCount)}</span>}
          {video.timestamp && (
            <span className="ml-auto text-neutral-400">{timeAgo(video.timestamp)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

"use client";

import { useState } from "react";
import type { IgVideo } from "@/lib/types";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";
import { proxied } from "@/lib/image";
import { Avatar, VerifiedBadge } from "../ui";

export type FeedChannel = {
  username: string;
  fullName: string | null;
  profilePic: string | null;
  isVerified: boolean;
};

export function FeedCard({
  video,
  channel,
  onOpen,
  onAddToPlaylist,
}: {
  video: IgVideo;
  channel: FeedChannel;
  onOpen: () => void;
  onAddToPlaylist: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumb = proxied(video.thumbnailUrl);
  const duration = formatDuration(video.durationSeconds);
  const title = video.caption?.trim() || `Video by @${channel.username}`;

  return (
    <div className="group">
      {/* Thumbnail */}
      <button
        onClick={onOpen}
        className="relative block aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 text-left"
      >
        {thumb && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-instagram-gradient opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {duration}
          </span>
        )}
      </button>

      {/* Meta */}
      <div className="mt-2.5 flex gap-3">
        <Avatar
          src={channel.profilePic}
          alt={channel.fullName || channel.username}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-100">
            {title}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-neutral-400">
            <span className="truncate">{channel.fullName || channel.username}</span>
            {channel.isVerified && <VerifiedBadge />}
          </p>
          <p className="text-xs text-neutral-500">
            {video.viewsCount != null && (
              <>{formatCount(video.viewsCount)} views · </>
            )}
            {timeAgo(video.timestamp) || "recently"}
          </p>
          <button
            onClick={onAddToPlaylist}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h11M4 12h11M4 18h7M17 14v6M14 17h6" strokeLinecap="round" />
            </svg>
            Playlist
          </button>
        </div>
      </div>
    </div>
  );
}

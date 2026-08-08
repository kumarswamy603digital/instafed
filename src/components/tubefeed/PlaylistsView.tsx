"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IgVideo, PlaylistDTO, PlaylistItemDTO } from "@/lib/types";
import { proxied } from "@/lib/image";
import { FeedCard, type FeedChannel } from "./FeedCard";

function itemToVideo(i: PlaylistItemDTO): IgVideo {
  return {
    id: i.videoKey,
    shortCode: i.shortCode || i.videoKey,
    url: i.url,
    caption: i.caption,
    thumbnailUrl: i.thumbnailUrl,
    videoUrl: i.videoUrl,
    likesCount: i.likesCount,
    commentsCount: i.commentsCount,
    viewsCount: i.viewsCount,
    durationSeconds: i.durationSeconds,
    timestamp: i.timestamp,
  };
}

export function PlaylistsView({
  focusCreateNonce,
  onOpenVideo,
  onAddToPlaylist,
  pinnedKeys,
  onTogglePin,
  onToast,
}: {
  focusCreateNonce: number;
  onOpenVideo: (v: IgVideo, c: FeedChannel) => void;
  onAddToPlaylist: (v: IgVideo, c: FeedChannel) => void;
  pinnedKeys?: Set<string>;
  onTogglePin?: (v: IgVideo, c: FeedChannel) => void;
  onToast: (msg: string) => void;
}) {
  const [playlists, setPlaylists] = useState<PlaylistDTO[] | null>(null);
  const [selected, setSelected] = useState<PlaylistDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const createRef = useRef<HTMLInputElement | null>(null);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/playlists");
    const data = await res.json().catch(() => ({ playlists: [] }));
    setPlaylists(data.playlists ?? []);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (focusCreateNonce > 0) {
      setSelected(null);
      createRef.current?.focus();
    }
  }, [focusCreateNonce]);

  async function openPlaylist(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      const data = await res.json();
      if (res.ok) setSelected(data.playlist as PlaylistDTO);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function createPlaylist() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewName("");
      await loadList();
      onToast(`Created playlist "${name}"`);
    } finally {
      setCreating(false);
    }
  }

  async function deletePlaylist(pl: PlaylistDTO) {
    if (!confirm(`Delete playlist "${pl.name}"?`)) return;
    await fetch(`/api/playlists/${pl.id}`, { method: "DELETE" });
    setSelected(null);
    await loadList();
  }

  async function removeItem(videoKey: string) {
    if (!selected) return;
    await fetch(
      `/api/playlists/${selected.id}/items?videoKey=${encodeURIComponent(videoKey)}`,
      { method: "DELETE" },
    );
    await openPlaylist(selected.id);
    await loadList();
  }

  /* ------------------------------ Detail view ----------------------------- */
  if (selected) {
    const items = selected.items ?? [];
    return (
      <div className="px-6 py-5">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← All playlists
        </button>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{selected.name}</h1>
            <p className="text-sm text-neutral-400">
              {items.length} video{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => deletePlaylist(selected)}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            Delete playlist
          </button>
        </div>

        {loadingDetail ? (
          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-video w-full rounded-xl" />
                <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
                <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-16 text-center text-neutral-500">
            This playlist is empty. Add videos with the “Playlist” button on any
            video.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((it, i) => {
              const video = itemToVideo(it);
              return (
                <div
                  key={it.id}
                  className="group/pi relative animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <button
                    onClick={() => removeItem(it.videoKey)}
                    title="Remove from playlist"
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-red-500 group-hover/pi:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                  <FeedCard
                    video={video}
                    channel={it.channel}
                    onOpen={() => onOpenVideo(video, it.channel)}
                    onAddToPlaylist={() => onAddToPlaylist(video, it.channel)}
                    isPinned={pinnedKeys?.has(video.id)}
                    onTogglePin={
                      onTogglePin
                        ? () => onTogglePin(video, it.channel)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------- List view ------------------------------ */
  return (
    <div className="px-6 py-5">
      <h1 className="text-3xl font-bold">Playlists</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Your saved collections of videos.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Create card */}
        <div className="flex flex-col justify-between rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-neutral-300">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-instagram-gradient text-lg font-bold">
              +
            </span>
            <span className="font-semibold">New playlist</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
              placeholder="Playlist name"
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={createPlaylist}
              disabled={!newName.trim() || creating}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>

        {playlists === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton aspect-video rounded-2xl" />
            ))
          : playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => openPlaylist(pl.id)}
                className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 text-left transition hover:border-neutral-700"
              >
                <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-0.5 bg-neutral-800">
                  {pl.covers.length === 0 ? (
                    <div className="col-span-2 row-span-2 bg-instagram-gradient opacity-20" />
                  ) : (
                    Array.from({ length: 4 }).map((_, i) => {
                      const src = pl.covers[i % pl.covers.length];
                      return (
                        <div key={i} className="overflow-hidden bg-neutral-900">
                          {src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={proxied(src) || undefined}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate font-semibold">{pl.name}</h3>
                  <p className="text-xs text-neutral-400">
                    {pl.itemCount} video{pl.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { IgVideo, PlaylistDTO } from "@/lib/types";
import type { FeedChannel } from "./FeedCard";

export function AddToPlaylistModal({
  video,
  channel,
  onClose,
  onChanged,
}: {
  video: IgVideo;
  channel: FeedChannel;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [playlists, setPlaylists] = useState<PlaylistDTO[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/playlists?videoKey=${encodeURIComponent(video.id)}`,
    );
    const data = await res.json().catch(() => ({ playlists: [] }));
    setPlaylists(data.playlists ?? []);
  }

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(pl: PlaylistDTO) {
    setBusy(pl.id);
    try {
      if (pl.hasVideo) {
        await fetch(
          `/api/playlists/${pl.id}/items?videoKey=${encodeURIComponent(video.id)}`,
          { method: "DELETE" },
        );
      } else {
        await fetch(`/api/playlists/${pl.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video, channel }),
        });
      }
      await load();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy("__new__");
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.playlist?.id) {
        await fetch(`/api/playlists/${data.playlist.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video, channel }),
        });
      }
      setNewName("");
      await load();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-lg font-bold">Save to playlist</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {playlists === null ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-9 rounded-lg" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              No playlists yet — create one below.
            </p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => toggle(pl)}
                disabled={busy === pl.id}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-50"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    pl.hasVideo ? "border-brand bg-brand" : "border-neutral-600"
                  }`}
                >
                  {pl.hasVideo && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{pl.name}</span>
                <span className="text-xs text-neutral-500">{pl.itemCount}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-800 p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            placeholder="New playlist name"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={createAndAdd}
            disabled={!newName.trim() || busy === "__new__"}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

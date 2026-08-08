"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IgVideo } from "@/lib/types";
import { VideoCard } from "./VideoCard";
import { VideoModal } from "./VideoModal";
import { Spinner, MockBadge } from "./ui";

export function VideosClient({ username }: { username: string }) {
  const [videos, setVideos] = useState<IgVideo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [active, setActive] = useState<IgVideo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/videos?username=${encodeURIComponent(username)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load videos.");
        if (!cancelled) {
          setVideos(data.videos as IgVideo[]);
          setMock(Boolean(data.mock));
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load videos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/subscriptions"
            className="text-sm text-neutral-400 hover:text-white transition"
          >
            ← Subscriptions
          </Link>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            @{username}
            {mock && <MockBadge />}
          </h1>
          {videos && (
            <p className="text-neutral-400 text-sm">
              {videos.length} video{videos.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <a
          href={`https://www.instagram.com/${encodeURIComponent(username)}/`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand-light hover:underline whitespace-nowrap"
        >
          Open on Instagram ↗
        </a>
      </div>

      {loading && <Spinner label="Fetching videos from Apify…" />}

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {!loading && videos && videos.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">
          No videos found for this account.
        </p>
      )}

      {!loading && videos && videos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} onOpen={() => setActive(v)} />
          ))}
        </div>
      )}

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </div>
  );
}

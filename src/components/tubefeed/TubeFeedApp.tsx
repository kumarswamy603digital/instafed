"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type {
  IgAccount,
  IgVideo,
  PlaylistItemDTO,
  SectionDTO,
  SubscriptionDTO,
} from "@/lib/types";
import { Avatar, VerifiedBadge } from "../ui";
import { VideoModal } from "../VideoModal";
import { FeedCard, type FeedChannel } from "./FeedCard";
import { SectionModal } from "./SectionModal";
import { PlaylistsView } from "./PlaylistsView";
import { AddToPlaylistModal } from "./AddToPlaylistModal";
import { SearchResultsPanel } from "./SearchResultsPanel";

type FeedVideo = { video: IgVideo; channel: FeedChannel };
type View =
  | { type: "all" }
  | { type: "channel"; username: string }
  | { type: "section"; id: string }
  | { type: "pinned" };

function savedToFeed(i: PlaylistItemDTO): FeedVideo {
  return {
    video: {
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
    },
    channel: i.channel,
  };
}

const DEBOUNCE_MS = 400;
const MIN_CHARS = 2;

async function fileToDownscaledDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.82,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

export function TubeFeedApp() {
  const { data: sessionData } = useSession();
  const userName = sessionData?.user?.name || sessionData?.user?.email || "You";

  const [subs, setSubs] = useState<SubscriptionDTO[] | null>(null);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [view, setView] = useState<View>({ type: "all" });
  const [tab, setTab] = useState<"videos" | "reels">("videos");

  const [feed, setFeed] = useState<FeedVideo[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [active, setActive] = useState<IgVideo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDTO | null>(null);

  const [mode, setMode] = useState<"sections" | "playlists" | "history">(
    "sections",
  );
  const [addTo, setAddTo] = useState<{ video: IgVideo; channel: FeedChannel } | null>(null);
  const [playlistFocusNonce, setPlaylistFocusNonce] = useState(0);

  const [pinned, setPinned] = useState<FeedVideo[]>([]);
  const [history, setHistory] = useState<FeedVideo[] | null>(null);
  const pinnedKeys = new Set(pinned.map((p) => p.video.id));

  // ---- Search (lifted here so results render in the main content area) ----
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IgAccount[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [searchBusy, setSearchBusy] = useState<string | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const searchLatest = useRef("");
  const searchActive = searchQuery.trim().length >= MIN_CHARS;

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < MIN_CHARS) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      searchLatest.current = q;
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (searchLatest.current !== q) return;
        setSearchResults((data.accounts as IgAccount[]) ?? []);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setSearchResults([]);
      } finally {
        if (searchLatest.current === q) setSearchLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleImageFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setOcrLoading(true);
    showToast("Reading account from image…");
    try {
      const imageBase64 = await fileToDownscaledDataUrl(file);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the image.");
      if (data.query) {
        setSearchQuery(data.query);
        showToast(`Detected "${data.query}" — searching…`);
      } else {
        showToast("No account name found in that image.");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not read the image.");
    } finally {
      setOcrLoading(false);
    }
  }

  function closeSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  const videosCache = useRef<Map<string, IgVideo[]>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const subscribedSet = new Set((subs ?? []).map((s) => s.igUsername));

  const refreshSubs = useCallback(async () => {
    const res = await fetch("/api/subscriptions");
    const data = await res.json().catch(() => ({ subscriptions: [] }));
    setSubs(data.subscriptions ?? []);
  }, []);

  const refreshSections = useCallback(async () => {
    const res = await fetch("/api/sections");
    const data = await res.json().catch(() => ({ sections: [] }));
    setSections(data.sections ?? []);
  }, []);

  const refreshPinned = useCallback(async () => {
    const res = await fetch("/api/pinned");
    const data = await res.json().catch(() => ({ items: [] }));
    setPinned(((data.items as PlaylistItemDTO[]) ?? []).map(savedToFeed));
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(null);
    const res = await fetch("/api/history");
    const data = await res.json().catch(() => ({ items: [] }));
    setHistory(((data.items as PlaylistItemDTO[]) ?? []).map(savedToFeed));
  }, []);

  useEffect(() => {
    refreshSubs();
    refreshSections();
    refreshPinned();
  }, [refreshSubs, refreshSections, refreshPinned]);

  const openVideo = useCallback((video: IgVideo, channel: FeedChannel) => {
    setActive(video);
    // Best-effort history record.
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video, channel }),
    }).catch(() => {});
  }, []);

  async function togglePin(video: IgVideo, channel: FeedChannel) {
    const isP = pinned.some((p) => p.video.id === video.id);
    setPinned((prev) =>
      isP
        ? prev.filter((p) => p.video.id !== video.id)
        : [{ video, channel }, ...prev],
    );
    try {
      if (isP) {
        await fetch(`/api/pinned?videoKey=${encodeURIComponent(video.id)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/pinned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video, channel }),
        });
      }
    } catch {
      refreshPinned();
    }
  }

  const channelFor = useCallback(
    (username: string): FeedChannel => {
      const s = (subs ?? []).find((x) => x.igUsername === username);
      return {
        username,
        fullName: s?.igFullName ?? null,
        profilePic: s?.igProfilePic ?? null,
        isVerified: s?.igIsVerified ?? false,
      };
    },
    [subs],
  );

  const fetchChannelVideos = useCallback(
    async (username: string): Promise<IgVideo[]> => {
      const cached = videosCache.current.get(username);
      if (cached) return cached;
      try {
        const res = await fetch(
          `/api/videos?username=${encodeURIComponent(username)}`,
        );
        const data = await res.json();
        if (!res.ok) return [];
        const vids = (data.videos as IgVideo[]) ?? [];
        videosCache.current.set(username, vids);
        return vids;
      } catch {
        return [];
      }
    },
    [],
  );

  // Load feed based on the current view (all / channel / section).
  useEffect(() => {
    if (subs === null) return;
    if (view.type === "pinned") return; // pinned uses local state, not Apify
    let cancelled = false;

    let targets: string[];
    if (view.type === "channel") {
      targets = [view.username];
    } else if (view.type === "section") {
      const sec = sections.find((s) => s.id === view.id);
      targets = sec ? sec.channelUsernames : [];
    } else {
      targets = subs.map((s) => s.igUsername);
    }

    if (targets.length === 0) {
      setFeed([]);
      setFeedLoading(false);
      return;
    }

    setFeedLoading(true);
    setFeed([]);
    const acc: FeedVideo[] = [];

    Promise.all(
      targets.map(async (username) => {
        const vids = await fetchChannelVideos(username);
        if (cancelled) return;
        const ch = channelFor(username);
        for (const v of vids) acc.push({ video: v, channel: ch });
        acc.sort((a, b) => {
          const ta = a.video.timestamp ? Date.parse(a.video.timestamp) : 0;
          const tb = b.video.timestamp ? Date.parse(b.video.timestamp) : 0;
          return tb - ta;
        });
        setFeed([...acc]);
      }),
    ).finally(() => {
      if (!cancelled) setFeedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [subs, sections, view, fetchChannelVideos, channelFor]);

  async function subscribe(acc: IgAccount) {
    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        igUsername: acc.username,
        igFullName: acc.fullName,
        igProfilePic: acc.profilePicUrl,
        igIsVerified: acc.isVerified,
        igIsPrivate: acc.isPrivate,
      }),
    });
    await refreshSubs();
    showToast(`Subscribed to @${acc.username}`);
  }

  async function subscribeFromSearch(acc: IgAccount) {
    setSearchBusy(acc.username);
    try {
      await subscribe(acc);
    } finally {
      setSearchBusy(null);
    }
  }

  async function unsubscribe(sub: SubscriptionDTO) {
    await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    videosCache.current.delete(sub.igUsername);
    if (view.type === "channel" && view.username === sub.igUsername) {
      setView({ type: "all" });
    }
    await refreshSubs();
    await refreshSections();
  }

  function openCreateSection() {
    setEditingSection(null);
    setSectionModalOpen(true);
  }
  function openEditSection(sec: SectionDTO) {
    setEditingSection(sec);
    setSectionModalOpen(true);
  }

  const isReel = (v: IgVideo) =>
    v.durationSeconds != null && v.durationSeconds <= 90;
  const displayed = feed.filter((f) =>
    tab === "reels" ? isReel(f.video) : !isReel(f.video),
  );

  const pinnedDisplayed = pinned.filter((f) =>
    tab === "reels" ? isReel(f.video) : !isReel(f.video),
  );

  const sectionTitle =
    view.type === "channel"
      ? `@${view.username}`
      : view.type === "section"
      ? sections.find((s) => s.id === view.id)?.name ?? "Section"
      : view.type === "pinned"
      ? "📌 Pinned"
      : "All";

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <TopBar
        userName={userName}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onImageFile={handleImageFile}
        searchLoading={searchLoading}
        ocrLoading={ocrLoading}
        onNewSection={openCreateSection}
        onNewPlaylist={() => {
          setMode("playlists");
          setPlaylistFocusNonce((n) => n + 1);
        }}
        onViewPlaylists={() => setMode("playlists")}
        onOpenHistory={() => {
          setMode("history");
          refreshHistory();
        }}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          subs={subs}
          view={view}
          onSelectChannel={(u) => setView({ type: "channel", username: u })}
          onSelectAll={() => setView({ type: "all" })}
          onUnsubscribe={unsubscribe}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <ChipBar
            mode={mode}
            onSetMode={setMode}
            sections={sections}
            view={view}
            onSelectAll={() => setView({ type: "all" })}
            onSelectSection={(id) => setView({ type: "section", id })}
            onSelectPinned={() => setView({ type: "pinned" })}
            onEditSection={openEditSection}
            onNewSection={openCreateSection}
            onToast={showToast}
          />

          {searchActive ? (
            <SearchResultsPanel
              query={searchQuery.trim()}
              results={searchResults}
              loading={searchLoading}
              subscribedSet={subscribedSet}
              busyUser={searchBusy}
              onSubscribe={subscribeFromSearch}
              onClose={closeSearch}
            />
          ) : mode === "playlists" ? (
            <PlaylistsView
              focusCreateNonce={playlistFocusNonce}
              onOpenVideo={openVideo}
              onAddToPlaylist={(v, c) => setAddTo({ video: v, channel: c })}
              pinnedKeys={pinnedKeys}
              onTogglePin={togglePin}
              onToast={showToast}
            />
          ) : mode === "history" ? (
            <HistoryView
              items={history}
              onOpenVideo={openVideo}
              pinnedKeys={pinnedKeys}
              onTogglePin={togglePin}
              onAddToPlaylist={(v, c) => setAddTo({ video: v, channel: c })}
              onClear={async () => {
                await fetch("/api/history", { method: "DELETE" });
                refreshHistory();
              }}
            />
          ) : (
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold">{sectionTitle}</h1>
              <div className="flex rounded-full border border-neutral-800 bg-neutral-900 p-0.5 text-sm">
                {(["videos", "reels"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-full px-5 py-2 font-medium capitalize transition ${
                      tab === t
                        ? "bg-white text-neutral-900"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {view.type === "pinned" ? (
              pinnedDisplayed.length === 0 ? (
                <p className="mt-16 text-center text-neutral-500">
                  No pinned {tab} yet. Tap “Pin” on any video to save it here.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pinnedDisplayed.map((f, i) => (
                    <div
                      key={`pin-${f.channel.username}-${f.video.id}`}
                      className="animate-fade-up"
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                    >
                      <FeedCard
                        video={f.video}
                        channel={f.channel}
                        onOpen={() => openVideo(f.video, f.channel)}
                        onAddToPlaylist={() =>
                          setAddTo({ video: f.video, channel: f.channel })
                        }
                        isPinned={pinnedKeys.has(f.video.id)}
                        onTogglePin={() => togglePin(f.video, f.channel)}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : subs !== null && subs.length === 0 ? (
              <EmptyState onToast={showToast} />
            ) : view.type === "section" &&
              (sections.find((s) => s.id === view.id)?.channelUsernames.length ??
                0) === 0 ? (
              <SectionEmpty
                onEdit={() => {
                  const sec = sections.find((s) => s.id === view.id);
                  if (sec) openEditSection(sec);
                }}
              />
            ) : feedLoading && displayed.length === 0 ? (
              <FeedSkeleton />
            ) : displayed.length === 0 ? (
              <p className="mt-16 text-center text-neutral-500">
                No {tab} to show here.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayed.map((f, i) => (
                  <div
                    key={`${f.channel.username}-${f.video.id}`}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  >
                    <FeedCard
                      video={f.video}
                      channel={f.channel}
                      onOpen={() => openVideo(f.video, f.channel)}
                      onAddToPlaylist={() =>
                        setAddTo({ video: f.video, channel: f.channel })
                      }
                      isPinned={pinnedKeys.has(f.video.id)}
                      onTogglePin={() => togglePin(f.video, f.channel)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </main>
      </div>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}

      {addTo && (
        <AddToPlaylistModal
          video={addTo.video}
          channel={addTo.channel}
          onClose={() => setAddTo(null)}
        />
      )}

      <SectionModal
        open={sectionModalOpen}
        initial={editingSection}
        subs={subs ?? []}
        onClose={() => setSectionModalOpen(false)}
        onSaved={refreshSections}
        onDeleted={(id) => {
          if (view.type === "section" && view.id === id) setView({ type: "all" });
          refreshSections();
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-sm shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-video w-full animate-pulse rounded-xl bg-neutral-900" />
          <div className="mt-2.5 h-4 w-4/5 animate-pulse rounded bg-neutral-900" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-neutral-900/70" />
        </div>
      ))}
    </div>
  );
}

function HistoryView({
  items,
  onOpenVideo,
  pinnedKeys,
  onTogglePin,
  onAddToPlaylist,
  onClear,
}: {
  items: FeedVideo[] | null;
  onOpenVideo: (v: IgVideo, c: FeedChannel) => void;
  pinnedKeys: Set<string>;
  onTogglePin: (v: IgVideo, c: FeedChannel) => void;
  onAddToPlaylist: (v: IgVideo, c: FeedChannel) => void;
  onClear: () => void;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-sm text-neutral-400">
            Videos you&apos;ve opened, most recent first.
          </p>
        </div>
        {items && items.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            Clear history
          </button>
        )}
      </div>

      {items === null ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <p className="mt-16 text-center text-neutral-500">
          No history yet — open a video to start building it.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((f, i) => (
            <div
              key={`hist-${f.channel.username}-${f.video.id}`}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <FeedCard
                video={f.video}
                channel={f.channel}
                onOpen={() => onOpenVideo(f.video, f.channel)}
                onAddToPlaylist={() => onAddToPlaylist(f.video, f.channel)}
                isPinned={pinnedKeys.has(f.video.id)}
                onTogglePin={() => onTogglePin(f.video, f.channel)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  TOP BAR                                    */
/* -------------------------------------------------------------------------- */

function TopBar({
  userName,
  query,
  onQueryChange,
  onImageFile,
  searchLoading,
  ocrLoading,
  onNewSection,
  onNewPlaylist,
  onViewPlaylists,
  onOpenHistory,
}: {
  userName: string;
  query: string;
  onQueryChange: (v: string) => void;
  onImageFile: (file: File | null | undefined) => void;
  searchLoading: boolean;
  ocrLoading: boolean;
  onNewSection: () => void;
  onNewPlaylist: () => void;
  onViewPlaylists: () => void;
  onOpenHistory: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    if (item) {
      e.preventDefault();
      onImageFile(item.getAsFile());
    }
  }

  return (
    <header className="z-30 flex h-[4.75rem] items-center gap-5 border-b border-neutral-800 bg-neutral-950/90 px-5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-instagram-gradient text-xl font-black">
          I
        </span>
        <div className="leading-tight">
          <div className="text-xl font-extrabold tracking-tight">InstaFed</div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            Your feed, your rules
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <div className="flex items-center rounded-full border border-neutral-700 bg-neutral-900 focus-within:border-brand">
          <span className="pl-5 text-neutral-500">@</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Search an account, or paste a profile screenshot"
            className="w-full bg-transparent px-3 py-3 text-[15px] outline-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onImageFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload / paste an Instagram screenshot to auto-detect the account"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition hover:text-white"
          >
            {ocrLoading ? (
              <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M21 17l-5-5-4 4-2-2-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <span className="flex h-10 w-11 items-center justify-center border-l border-neutral-800">
            {searchLoading ? (
              <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            )}
          </span>
        </div>

      </div>

      <div className="flex items-center gap-2.5">
        <ActionButton label="New Section" onClick={onNewSection} />
        <ActionButton label="New Playlist" onClick={onNewPlaylist} />
        <button
          onClick={onViewPlaylists}
          className="hidden rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white lg:inline-block"
        >
          Playlists
        </button>
        <button
          onClick={onOpenHistory}
          className="hidden rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white lg:inline-block"
        >
          History
        </button>
        <div className="mx-1 h-7 w-px bg-neutral-800" />
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-full border border-neutral-800 py-1 pl-1 pr-3 hover:bg-white/5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-instagram-gradient text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[110px] truncate text-sm text-neutral-300 sm:inline">
              {userName}
            </span>
          </button>
          <div className="absolute right-0 top-full z-20 hidden pt-2 group-hover:block">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-36 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-left text-sm hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="hidden rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white lg:inline-block"
    >
      + {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SIDEBAR                                    */
/* -------------------------------------------------------------------------- */

function Sidebar({
  subs,
  view,
  onSelectChannel,
  onSelectAll,
  onUnsubscribe,
}: {
  subs: SubscriptionDTO[] | null;
  view: View;
  onSelectChannel: (username: string) => void;
  onSelectAll: () => void;
  onUnsubscribe: (sub: SubscriptionDTO) => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-neutral-800 bg-neutral-950/50 py-4 md:block">
      <button
        onClick={onSelectAll}
        className={`mb-1 flex w-full items-center gap-2 px-5 py-2 text-sm font-medium transition ${
          view.type === "all" ? "text-white" : "text-neutral-400 hover:text-white"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 12l9-9 9 9M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All videos
      </button>

      <p className="px-5 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Subscriptions
      </p>

      {subs === null ? (
        <div className="space-y-1 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-800" />
              <div className="h-3 w-28 animate-pulse rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : subs.length === 0 ? (
        <p className="px-5 py-3 text-sm text-neutral-500">
          No subscriptions yet. Use search to add channels.
        </p>
      ) : (
        <ul className="px-2">
          {subs.map((s) => {
            const activeRow =
              view.type === "channel" && view.username === s.igUsername;
            return (
              <li key={s.id} className="group/row">
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    activeRow ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => onSelectChannel(s.igUsername)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Avatar
                      src={s.igProfilePic}
                      alt={s.igFullName || s.igUsername}
                      size={32}
                    />
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-sm">
                        {s.igFullName || s.igUsername}
                      </span>
                      {s.igIsVerified && <VerifiedBadge />}
                    </span>
                  </button>
                  <button
                    onClick={() => onUnsubscribe(s)}
                    title="Unsubscribe"
                    className="shrink-0 rounded p-1 text-neutral-600 opacity-0 transition hover:text-red-400 group-hover/row:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 CHIP BAR                                    */
/* -------------------------------------------------------------------------- */

function ChipBar({
  mode,
  onSetMode,
  sections,
  view,
  onSelectAll,
  onSelectSection,
  onSelectPinned,
  onEditSection,
  onNewSection,
  onToast,
}: {
  mode: "sections" | "playlists" | "history";
  onSetMode: (m: "sections" | "playlists") => void;
  sections: SectionDTO[];
  view: View;
  onSelectAll: () => void;
  onSelectSection: (id: string) => void;
  onSelectPinned: () => void;
  onEditSection: (sec: SectionDTO) => void;
  onNewSection: () => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-800 bg-neutral-950/90 px-6 py-3 backdrop-blur">
      <div className="flex shrink-0 rounded-full border border-neutral-800 bg-neutral-900 p-0.5 text-sm">
        {(["sections", "playlists"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onSetMode(m)}
            className={`rounded-full px-4 py-1.5 font-medium capitalize transition ${
              mode === m
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "sections" && (
      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={onSelectAll}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
            view.type === "all"
              ? "bg-white text-neutral-900"
              : "border border-neutral-800 text-neutral-300 hover:bg-white/5"
          }`}
        >
          All
        </button>
        <button
          onClick={onSelectPinned}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
            view.type === "pinned"
              ? "bg-white text-neutral-900"
              : "border border-neutral-800 text-neutral-300 hover:bg-white/5"
          }`}
        >
          📌 Pinned
        </button>

        {sections.map((sec) => {
          const activeSec = view.type === "section" && view.id === sec.id;
          return (
            <span
              key={sec.id}
              className={`inline-flex items-center whitespace-nowrap rounded-full text-sm font-medium transition ${
                activeSec
                  ? "bg-white text-neutral-900"
                  : "border border-neutral-800 text-neutral-300 hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => onSelectSection(sec.id)}
                className="py-1.5 pl-4 pr-2"
              >
                {sec.name}
              </button>
              {activeSec && (
                <button
                  onClick={() => onEditSection(sec)}
                  title="Edit section"
                  className="pr-2 text-neutral-500 hover:text-neutral-900"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </span>
          );
        })}

        <button
          onClick={onNewSection}
          title="New section"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-700 text-base text-neutral-400 transition hover:border-brand hover:text-white"
        >
          +
        </button>
      </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                EMPTY STATES                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-instagram-gradient shadow-2xl">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-6 text-xl font-semibold">Your feed is empty</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Search for an Instagram account in the bar above and subscribe — their
        videos will show up here.
      </p>
      <button
        onClick={() => onToast("Type a name in the search bar at the top")}
        className="mt-6 rounded-xl bg-brand px-6 py-2.5 font-semibold hover:bg-brand-dark"
      >
        Find accounts
      </button>
    </div>
  );
}

function SectionEmpty({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">This section has no channels yet</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Add some of your subscribed accounts to this section to see their videos
        here.
      </p>
      <button
        onClick={onEdit}
        className="mt-6 rounded-xl bg-brand px-6 py-2.5 font-semibold hover:bg-brand-dark"
      >
        Add channels
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type {
  IgAccount,
  IgVideo,
  SectionDTO,
  SubscriptionDTO,
} from "@/lib/types";
import { Avatar, VerifiedBadge } from "../ui";
import { VideoModal } from "../VideoModal";
import { FeedCard, type FeedChannel } from "./FeedCard";
import { SectionModal } from "./SectionModal";

type FeedVideo = { video: IgVideo; channel: FeedChannel };
type View =
  | { type: "all" }
  | { type: "channel"; username: string }
  | { type: "section"; id: string };

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

  useEffect(() => {
    refreshSubs();
    refreshSections();
  }, [refreshSubs, refreshSections]);

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

  const sectionTitle =
    view.type === "channel"
      ? `@${view.username}`
      : view.type === "section"
      ? sections.find((s) => s.id === view.id)?.name ?? "Section"
      : "All";

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <TopBar
        userName={userName}
        subscribedSet={subscribedSet}
        onSubscribe={subscribe}
        onToast={showToast}
        onNewSection={openCreateSection}
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
            sections={sections}
            view={view}
            onSelectAll={() => setView({ type: "all" })}
            onSelectSection={(id) => setView({ type: "section", id })}
            onEditSection={openEditSection}
            onNewSection={openCreateSection}
            onToast={showToast}
          />

          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">{sectionTitle}</h1>
              <div className="flex rounded-full border border-neutral-800 bg-neutral-900 p-0.5 text-sm">
                {(["videos", "reels"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-1.5 font-medium capitalize transition ${
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

            {subs !== null && subs.length === 0 ? (
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
                      onOpen={() => setActive(f.video)}
                      onAddToPlaylist={() =>
                        showToast("Playlists are coming in the next step")
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}

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

/* -------------------------------------------------------------------------- */
/*                                  TOP BAR                                    */
/* -------------------------------------------------------------------------- */

function TopBar({
  userName,
  subscribedSet,
  onSubscribe,
  onToast,
  onNewSection,
}: {
  userName: string;
  subscribedSet: Set<string>;
  onSubscribe: (acc: IgAccount) => Promise<void>;
  onToast: (msg: string) => void;
  onNewSection: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgAccount[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const latest = useRef("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleImageFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setOcrLoading(true);
    onToast("Reading account from image…");
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
        setQuery(data.query);
        setOpen(true);
        onToast(`Detected "${data.query}" — searching…`);
      } else {
        onToast("No account name found in that image.");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not read the image.");
    } finally {
      setOcrLoading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    if (item) {
      e.preventDefault();
      handleImageFile(item.getAsFile());
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults(null);
      setLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      latest.current = q;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (latest.current !== q) return;
        setResults((data.accounts as IgAccount[]) ?? []);
        setOpen(true);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setResults([]);
      } finally {
        if (latest.current === q) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  async function handleSubscribe(acc: IgAccount) {
    setBusy(acc.username);
    try {
      await onSubscribe(acc);
    } finally {
      setBusy(null);
    }
  }

  return (
    <header className="z-30 flex h-16 items-center gap-4 border-b border-neutral-800 bg-neutral-950/90 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-instagram-gradient text-lg font-black">
          I
        </span>
        <div className="leading-none">
          <div className="text-lg font-extrabold tracking-tight">InstaFed</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Your feed, your rules
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <div className="flex items-center rounded-full border border-neutral-700 bg-neutral-900 focus-within:border-brand">
          <span className="pl-4 text-neutral-500">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results && setOpen(true)}
            onPaste={handlePaste}
            placeholder="Search an account, or paste a profile screenshot"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleImageFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload / paste an Instagram screenshot to auto-detect the account"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:text-white"
          >
            {ocrLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M21 17l-5-5-4 4-2-2-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <span className="flex h-9 w-10 items-center justify-center border-l border-neutral-800">
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            )}
          </span>
        </div>

        {open && results && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-neutral-500">
                  No accounts found.
                </p>
              ) : (
                results.map((acc) => {
                  const subbed = subscribedSet.has(acc.username);
                  return (
                    <div
                      key={acc.username}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
                    >
                      <Avatar
                        src={acc.profilePicUrl}
                        alt={acc.fullName || acc.username}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-sm font-medium">
                            {acc.fullName || acc.username}
                          </span>
                          {acc.isVerified && <VerifiedBadge />}
                        </div>
                        <p className="truncate text-xs text-neutral-400">
                          @{acc.username}
                        </p>
                      </div>
                      <button
                        onClick={() => !subbed && handleSubscribe(acc)}
                        disabled={subbed || busy === acc.username}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          subbed
                            ? "border border-neutral-700 text-neutral-400"
                            : "bg-brand hover:bg-brand-dark"
                        } disabled:opacity-60`}
                      >
                        {busy === acc.username
                          ? "…"
                          : subbed
                          ? "Subscribed"
                          : "Subscribe"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ActionButton label="New Section" onClick={onNewSection} />
        <ActionButton label="New Playlist" onClick={() => onToast("Playlists are coming in the next step")} />
        <ActionButton label="History" onClick={() => onToast("History is coming in a later step")} />
        <div className="mx-1 h-6 w-px bg-neutral-800" />
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-full border border-neutral-800 py-1 pl-1 pr-3 hover:bg-white/5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-instagram-gradient text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[100px] truncate text-sm text-neutral-300 sm:inline">
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
      className="hidden rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white lg:inline-block"
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
  sections,
  view,
  onSelectAll,
  onSelectSection,
  onEditSection,
  onNewSection,
  onToast,
}: {
  sections: SectionDTO[];
  view: View;
  onSelectAll: () => void;
  onSelectSection: (id: string) => void;
  onEditSection: (sec: SectionDTO) => void;
  onNewSection: () => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-800 bg-neutral-950/90 px-6 py-2.5 backdrop-blur">
      <div className="flex shrink-0 rounded-full border border-neutral-800 bg-neutral-900 p-0.5 text-xs">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-neutral-900">
          Sections
        </span>
        <button
          onClick={() => onToast("Playlists are coming in the next step")}
          className="rounded-full px-3 py-1 font-medium text-neutral-400 hover:text-white"
        >
          Playlists
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={onSelectAll}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
            view.type === "all"
              ? "bg-white text-neutral-900"
              : "border border-neutral-800 text-neutral-300 hover:bg-white/5"
          }`}
        >
          All
        </button>
        <button
          onClick={() => onToast("Pinned is coming in a later step")}
          className="whitespace-nowrap rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/5"
        >
          📌 Pinned
        </button>

        {sections.map((sec) => {
          const activeSec = view.type === "section" && view.id === sec.id;
          return (
            <span
              key={sec.id}
              className={`inline-flex items-center whitespace-nowrap rounded-full text-xs font-medium transition ${
                activeSec
                  ? "bg-white text-neutral-900"
                  : "border border-neutral-800 text-neutral-300 hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => onSelectSection(sec.id)}
                className="py-1 pl-3 pr-1.5"
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
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-700 text-neutral-400 transition hover:border-brand hover:text-white"
        >
          +
        </button>
      </div>
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

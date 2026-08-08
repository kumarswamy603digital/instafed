"use client";

import { useEffect, useRef, useState } from "react";
import type { IgAccount, SubscriptionDTO } from "@/lib/types";
import { AccountCard } from "./AccountCard";
import { AccountCardSkeleton, MockBadge } from "./ui";

const SUGGESTIONS = ["nasa", "natgeo", "nike", "9gag", "cristiano", "google"];
const DEBOUNCE_MS = 400;
const MIN_CHARS = 2;

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgAccount[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [busyUser, setBusyUser] = useState<string | null>(null);

  // Per-query cache + in-flight request control so typing feels instant.
  const cache = useRef<Map<string, IgAccount[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const latestQuery = useRef("");

  // Load current subscriptions so we can show correct button states.
  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : { subscriptions: [] }))
      .then((data: { subscriptions: SubscriptionDTO[] }) => {
        setSubscribed(new Set(data.subscriptions.map((s) => s.igUsername)));
      })
      .catch(() => {});
  }, []);

  async function runSearch(raw: string) {
    const q = raw.trim();
    latestQuery.current = q;
    if (q.length < MIN_CHARS) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Serve from cache instantly.
    const cached = cache.current.get(q.toLowerCase());
    if (cached) {
      setResults(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Cancel any previous in-flight request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      // Ignore stale responses (a newer query has since been typed).
      if (latestQuery.current !== q) return;
      const accounts = data.accounts as IgAccount[];
      cache.current.set(q.toLowerCase(), accounts);
      setResults(accounts);
      setMock(Boolean(data.mock));
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // superseded
      if (latestQuery.current === q) {
        setError(err instanceof Error ? err.message : "Search failed.");
      }
    } finally {
      if (latestQuery.current === q) setLoading(false);
    }
  }

  // Debounced live search as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      abortRef.current?.abort();
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query); // immediate on Enter / button
  }

  async function toggleSubscription(account: IgAccount) {
    setBusyUser(account.username);
    const isSubbed = subscribed.has(account.username);

    // Optimistic UI for snappiness.
    setSubscribed((prev) => {
      const next = new Set(prev);
      if (isSubbed) next.delete(account.username);
      else next.add(account.username);
      return next;
    });

    try {
      if (isSubbed) {
        const listRes = await fetch("/api/subscriptions");
        const listData = await listRes.json();
        const sub = (listData.subscriptions as SubscriptionDTO[]).find(
          (s) => s.igUsername === account.username,
        );
        if (sub) {
          await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
        }
      } else {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            igUsername: account.username,
            igFullName: account.fullName,
            igProfilePic: account.profilePicUrl,
            igIsVerified: account.isVerified,
            igIsPrivate: account.isPrivate,
          }),
        });
      }
    } catch {
      // Revert on failure.
      setSubscribed((prev) => {
        const next = new Set(prev);
        if (isSubbed) next.add(account.username);
        else next.delete(account.username);
        return next;
      });
    } finally {
      setBusyUser(null);
    }
  }

  const showEmptyHero = !loading && !results && !error && query.trim().length < MIN_CHARS;

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
            @
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a name or username, e.g. Vishnu Vijayan"
            autoFocus
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900/70 py-3 pl-9 pr-10 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || query.trim().length < MIN_CHARS}
          className="rounded-xl bg-brand px-6 py-3 font-semibold shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {mock && (results || loading) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
          <MockBadge />
          <span>
            Apify token not configured — showing sample results. Add{" "}
            <code className="text-neutral-300">APIFY_TOKEN</code> to use live data.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Skeletons while loading */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty hero with suggestions */}
      {showEmptyHero && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center animate-fade-up">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-instagram-gradient shadow-2xl">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold">Search for an Instagram account</h2>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            Just start typing a name or username — matching accounts appear
            automatically. Subscribe to collect all of their videos.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-neutral-500">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-300 transition hover:border-brand hover:text-white"
              >
                @{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && results && results.length === 0 && (
        <p className="mt-16 text-center text-neutral-500">
          No accounts found for “{query.trim()}”.
        </p>
      )}

      {!loading && results && results.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((acc, i) => (
            <div
              key={acc.username}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 55}ms` }}
            >
              <AccountCard
                account={acc}
                subscribed={subscribed.has(acc.username)}
                busy={busyUser === acc.username}
                onToggle={toggleSubscription}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

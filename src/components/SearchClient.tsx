"use client";

import { useEffect, useState } from "react";
import type { IgAccount, SubscriptionDTO } from "@/lib/types";
import { AccountCard } from "./AccountCard";
import { Spinner, MockBadge } from "./ui";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgAccount[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [busyUser, setBusyUser] = useState<string | null>(null);

  // Load current subscriptions so we can show correct button states.
  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : { subscriptions: [] }))
      .then((data: { subscriptions: SubscriptionDTO[] }) => {
        setSubscribed(new Set(data.subscriptions.map((s) => s.igUsername)));
      })
      .catch(() => {});
  }, []);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.accounts as IgAccount[]);
      setMock(Boolean(data.mock));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSubscription(account: IgAccount) {
    setBusyUser(account.username);
    const isSubbed = subscribed.has(account.username);
    try {
      if (isSubbed) {
        // Need the subscription id to delete; look it up.
        const listRes = await fetch("/api/subscriptions");
        const listData = await listRes.json();
        const sub = (listData.subscriptions as SubscriptionDTO[]).find(
          (s) => s.igUsername === account.username,
        );
        if (sub) {
          await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
        }
        setSubscribed((prev) => {
          const next = new Set(prev);
          next.delete(account.username);
          return next;
        });
      } else {
        const res = await fetch("/api/subscriptions", {
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
        if (res.ok) {
          setSubscribed((prev) => new Set(prev).add(account.username));
        }
      }
    } catch {
      // no-op; button state stays as-is
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <div>
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            @
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a username, e.g. nasa"
            className="w-full rounded-lg bg-neutral-900 border border-neutral-700 pl-8 pr-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 rounded-lg font-semibold bg-brand hover:bg-brand-dark transition disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {mock && (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
          <MockBadge />
          <span>
            Apify token not configured — showing sample results. Add{" "}
            <code className="text-neutral-300">APIFY_TOKEN</code> to use live data.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {loading && <Spinner label="Searching Instagram…" />}

      {!loading && results && results.length === 0 && (
        <p className="mt-8 text-center text-neutral-500">
          No accounts found for “{query}”.
        </p>
      )}

      {!loading && results && results.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((acc) => (
            <AccountCard
              key={acc.username}
              account={acc}
              subscribed={subscribed.has(acc.username)}
              busy={busyUser === acc.username}
              onToggle={toggleSubscription}
            />
          ))}
        </div>
      )}
    </div>
  );
}

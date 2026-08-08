"use client";

import type { IgAccount } from "@/lib/types";
import { formatCount } from "@/lib/format";
import { Avatar, VerifiedBadge } from "../ui";

export function SearchResultsPanel({
  query,
  results,
  loading,
  error,
  subscribedSet,
  busyUser,
  onSubscribe,
  onClose,
}: {
  query: string;
  results: IgAccount[] | null;
  loading: boolean;
  error?: string | null;
  subscribedSet: Set<string>;
  busyUser: string | null;
  onSubscribe: (acc: IgAccount) => void;
  onClose: () => void;
}) {
  const showSkeleton = loading && (!results || results.length === 0);

  return (
    <div className="px-6 py-5">
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <h2 className="text-lg font-bold">
            Search results for “{query}”
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="divide-y divide-neutral-800/60">
          {showSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
                <div className="skeleton h-8 w-24 shrink-0 rounded-lg" />
              </div>
            ))
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="mx-auto max-w-md text-sm text-red-300">
                Couldn&apos;t search Instagram: {error}
              </p>
              <p className="mx-auto mt-3 max-w-md text-xs text-neutral-500">
                This usually means the Apify token is missing/invalid, you&apos;re
                out of Apify credits, or the actor hit a rate limit or timeout.
                Check your <code className="text-neutral-300">APIFY_TOKEN</code> and
                Apify usage, then try again.
              </p>
            </div>
          ) : results && results.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-neutral-400">No accounts found for “{query}”.</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-neutral-500">
                Try the exact @username instead of the full name (e.g. type
                <span className="text-neutral-300"> nileshhada</span> rather than
                “Nilesh Hada”). Instagram ranks handles more reliably than names.
              </p>
            </div>
          ) : (
            results?.map((acc) => {
              const subbed = subscribedSet.has(acc.username);
              return (
                <div
                  key={acc.username}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <Avatar
                    src={acc.profilePicUrl}
                    alt={acc.fullName || acc.username}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-semibold">
                        {acc.fullName || acc.username}
                      </span>
                      {acc.isVerified && <VerifiedBadge />}
                      {acc.isPrivate && (
                        <span className="rounded border border-neutral-700 px-1 text-[10px] uppercase tracking-wide text-neutral-500">
                          private
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-neutral-400">
                      @{acc.username}
                      {acc.followersCount != null &&
                        ` · ${formatCount(acc.followersCount)} followers`}
                    </p>
                  </div>
                  <button
                    onClick={() => !subbed && onSubscribe(acc)}
                    disabled={subbed || busyUser === acc.username}
                    className={`shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition disabled:opacity-70 ${
                      subbed
                        ? "border border-neutral-700 text-neutral-400"
                        : "bg-brand hover:bg-brand-dark"
                    }`}
                  >
                    {busyUser === acc.username ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-2px]" />
                    ) : subbed ? (
                      "Subscribed"
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

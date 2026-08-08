"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SubscriptionDTO } from "@/lib/types";
import { Avatar, VerifiedBadge, AccountCardSkeleton } from "./ui";

export function SubscriptionsClient() {
  const [subs, setSubs] = useState<SubscriptionDTO[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/subscriptions");
    const data = await res.json();
    setSubs(data.subscriptions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function unsubscribe(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubs((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (subs === null) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AccountCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 p-10 text-center">
        <p className="text-neutral-400">You haven&apos;t subscribed to anyone yet.</p>
        <Link
          href="/dashboard"
          className="inline-block mt-4 px-5 py-2.5 rounded-lg font-semibold bg-brand hover:bg-brand-dark transition"
        >
          Search accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {subs.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-4"
        >
          <Avatar src={s.igProfilePic} alt={s.igUsername} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate">
                {s.igFullName || s.igUsername}
              </span>
              {s.igIsVerified && <VerifiedBadge />}
            </div>
            <p className="text-sm text-neutral-400 truncate">@{s.igUsername}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/dashboard/account/${encodeURIComponent(s.igUsername)}`}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-brand hover:bg-brand-dark transition"
            >
              View videos
            </Link>
            <button
              onClick={() => unsubscribe(s.id)}
              disabled={busyId === s.id}
              className="text-xs text-neutral-500 hover:text-red-400 transition disabled:opacity-50"
            >
              {busyId === s.id ? "Removing…" : "Unsubscribe"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

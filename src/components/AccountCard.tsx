"use client";

import Link from "next/link";
import type { IgAccount } from "@/lib/types";
import { formatCount } from "@/lib/format";
import { Avatar, VerifiedBadge } from "./ui";

export function AccountCard({
  account,
  subscribed,
  busy,
  onToggle,
}: {
  account: IgAccount;
  subscribed: boolean;
  busy: boolean;
  onToggle: (account: IgAccount) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-4">
      <Avatar src={account.profilePicUrl} alt={account.username} size={56} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="font-semibold truncate">@{account.username}</span>
          {account.isVerified && <VerifiedBadge />}
          {account.isPrivate && (
            <span className="text-[10px] uppercase tracking-wide text-neutral-500 border border-neutral-700 rounded px-1">
              private
            </span>
          )}
        </div>
        {account.fullName && (
          <p className="text-sm text-neutral-400 truncate">{account.fullName}</p>
        )}
        {account.followersCount !== null && (
          <p className="text-xs text-neutral-500 mt-0.5">
            {formatCount(account.followersCount)} followers
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => onToggle(account)}
          disabled={busy}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
            subscribed
              ? "border border-neutral-700 hover:bg-neutral-800"
              : "bg-brand hover:bg-brand-dark"
          }`}
        >
          {busy ? "…" : subscribed ? "Subscribed" : "Subscribe"}
        </button>
        {subscribed && (
          <Link
            href={`/dashboard/account/${encodeURIComponent(account.username)}`}
            className="text-xs text-brand-light hover:underline"
          >
            View videos →
          </Link>
        )}
      </div>
    </div>
  );
}

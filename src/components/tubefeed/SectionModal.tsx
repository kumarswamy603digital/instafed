"use client";

import { useEffect, useState } from "react";
import type { SectionDTO, SubscriptionDTO } from "@/lib/types";
import { Avatar } from "../ui";

export function SectionModal({
  open,
  initial,
  subs,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  initial: SectionDTO | null;
  subs: SubscriptionDTO[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setSelectedIds(new Set(initial?.subscriptionIds ?? []));
      setError(null);
    }
  }, [open, initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = Boolean(initial);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a section name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: trimmed,
        subscriptionIds: Array.from(selectedIds),
      };
      const res = await fetch(
        isEdit ? `/api/sections/${initial!.id}` : "/api/sections",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save the section.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm(`Delete section "${initial.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sections/${initial.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted?.(initial.id);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-lg font-bold">
            {isEdit ? "Edit section" : "New section"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm text-neutral-300">Section name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Updates"
              autoFocus
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-neutral-300">
                Channels ({selectedIds.size} selected)
              </span>
            </div>
            {subs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
                Subscribe to some accounts first, then add them here.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-neutral-800 p-1.5">
                {subs.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                        checked ? "bg-brand/15" : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-brand bg-brand"
                            : "border-neutral-600"
                        }`}
                      >
                        {checked && (
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <Avatar
                        src={s.igProfilePic}
                        alt={s.igFullName || s.igUsername}
                        size={30}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {s.igFullName || s.igUsername}
                        <span className="ml-1 text-xs text-neutral-500">
                          @{s.igUsername}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4">
          <div>
            {isEdit && (
              <button
                onClick={remove}
                disabled={saving}
                className="text-sm text-neutral-500 transition hover:text-red-400 disabled:opacity-50"
              >
                Delete section
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create section"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

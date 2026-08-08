"use client";

import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="block text-center text-3xl font-extrabold bg-instagram-gradient bg-clip-text text-transparent mb-8"
        >
          InstaFed
        </Link>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-neutral-400 text-sm mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-neutral-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="mt-1 w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
      />
    </label>
  );
}

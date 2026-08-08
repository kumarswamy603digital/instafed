"use client";

import Link from "next/link";

function Glows({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#833AB4] opacity-25 blur-[130px]" />
      <div className="absolute bottom-0 -right-24 h-96 w-96 rounded-full bg-[#E1306C] opacity-25 blur-[130px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

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
    <main className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100 lg:grid lg:grid-cols-2">
      {/* Left: brand / value panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <Glows />
        <Link
          href="/"
          className="relative z-10 text-2xl font-extrabold tracking-tight bg-instagram-gradient bg-clip-text text-transparent"
        >
          InstaFed
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            Your favorite creators&apos; videos,
            <span className="block bg-instagram-gradient bg-clip-text text-transparent">
              all in one feed.
            </span>
          </h2>
          <ul className="mt-10 space-y-5">
            {[
              ["Search", "Find any Instagram handle by username."],
              ["Subscribe", "Save the creators you love."],
              ["Watch", "Browse every video in one clean place."],
            ].map(([t, d]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-instagram-gradient">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="font-semibold">{t}</span>
                  <span className="text-neutral-400"> — {d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-neutral-500">
          Powered by Apify
        </p>
      </aside>

      {/* Right: form panel */}
      <div className="relative flex min-h-screen w-full items-center justify-center p-6 lg:min-h-0">
        <Glows className="lg:hidden" />
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 block text-center text-3xl font-extrabold bg-instagram-gradient bg-clip-text text-transparent lg:hidden"
          >
            InstaFed
          </Link>
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 shadow-2xl backdrop-blur-xl">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 mb-6 text-sm text-neutral-400">{subtitle}</p>
            {children}
          </div>
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
        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Search" },
    { href: "/dashboard/subscriptions", label: "Subscriptions" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-xl font-extrabold bg-instagram-gradient bg-clip-text text-transparent"
        >
          InstaFed
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-neutral-400 max-w-[140px] truncate">
            {userName}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-700 hover:bg-neutral-800 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

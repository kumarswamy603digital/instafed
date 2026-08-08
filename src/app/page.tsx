import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-neutral-950 text-neutral-100">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-[#833AB4] opacity-20 blur-[140px]" />
        <div className="absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#E1306C] opacity-20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-[#F77737] opacity-10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="text-2xl font-extrabold tracking-tight bg-instagram-gradient bg-clip-text text-transparent">
            InstaFed
          </span>
          <nav className="hidden items-center gap-8 text-sm text-neutral-400 md:flex">
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#features" className="hover:text-white transition">Features</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white transition"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold shadow-lg shadow-brand/25 hover:bg-brand-dark transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-2 lg:pt-24">
        {/* Left: copy */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Powered by Apify · No endless scrolling
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
            Your favorite creators&apos; videos,
            <span className="mt-2 block bg-instagram-gradient bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x">
              all in one feed.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
            Search any Instagram account by username, subscribe to the ones you
            love, and instantly browse every one of their videos and reels — in a
            clean, distraction-free grid you control.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-semibold shadow-xl shadow-brand/30 hover:bg-brand-dark transition"
            >
              Get started — it&apos;s free
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-medium text-neutral-200 hover:bg-white/10 transition"
            >
              I already have an account
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              {["a", "b", "c", "d"].map((s, i) => (
                <span
                  key={s}
                  className="h-9 w-9 rounded-full border-2 border-neutral-950 bg-instagram-gradient"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-300">Unlimited</span>{" "}
              videos per account · your own private library
            </p>
          </div>
        </div>

        {/* Right: product preview */}
        <div className="relative animate-fade-up [animation-delay:150ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-instagram-gradient opacity-20 blur-3xl" />
          <div className="animate-float rounded-2xl border border-white/10 bg-neutral-900/70 p-4 shadow-2xl backdrop-blur-xl">
            {/* window chrome */}
            <div className="flex items-center gap-2 pb-3">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <div className="ml-3 flex-1 rounded-md bg-white/5 px-3 py-1 text-[11px] text-neutral-500">
                instafed.app/dashboard
              </div>
            </div>

            {/* fake search bar */}
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2.5">
              <span className="text-neutral-500">@</span>
              <span className="text-sm text-neutral-300">natgeo</span>
              <span className="ml-auto rounded-md bg-brand px-3 py-1 text-xs font-semibold">
                Search
              </span>
            </div>

            {/* fake video grid */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/5"
                >
                  <div
                    className="absolute inset-0 bg-instagram-gradient"
                    style={{ opacity: 0.35 + (i % 3) * 0.2 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex justify-between text-[9px] text-neutral-200">
                    <span>▶ {(i + 1) * 12}K</span>
                    <span>♥ {(i + 1) * 3}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-light">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Three steps to your perfect feed
            </h2>
            <p className="mt-4 text-neutral-400">
              No algorithms, no ads, no doomscrolling. Just the creators you chose.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="group relative rounded-2xl border border-white/10 bg-neutral-900/40 p-7 transition hover:border-white/20 hover:bg-neutral-900/70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-instagram-gradient text-lg font-bold shadow-lg">
                  {s.step}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-neutral-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6 transition hover:bg-neutral-900/70"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/50 px-8 py-16 text-center">
          <div className="absolute -inset-24 -z-10 bg-instagram-gradient opacity-10 blur-3xl" />
          <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
            Build your own Instagram video library today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-400">
            Free to start. Bring your Apify token and pull unlimited videos from
            any public account.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-base font-semibold shadow-xl shadow-brand/30 hover:bg-brand-dark transition"
          >
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
          <span className="text-lg font-extrabold bg-instagram-gradient bg-clip-text text-transparent">
            InstaFed
          </span>
          <p>© {new Date().getFullYear()} InstaFed. Powered by Apify.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white transition">Log in</Link>
            <Link href="/register" className="hover:text-white transition">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const STEPS = [
  {
    step: "1",
    title: "Search",
    body: "Type any Instagram username and instantly find the matching accounts.",
  },
  {
    step: "2",
    title: "Subscribe",
    body: "Save the creators you care about to your own private subscription list.",
  },
  {
    step: "3",
    title: "Watch",
    body: "Browse and play every video and reel from each account in a clean grid.",
  },
];

const FEATURES = [
  { icon: "🔍", title: "Fast search", body: "Find any public handle in seconds." },
  { icon: "♾️", title: "Unlimited videos", body: "Pull every video an account has posted." },
  { icon: "🔒", title: "Private & yours", body: "Your subscriptions live in your own account." },
  { icon: "⚡", title: "No noise", body: "No ads, no algorithm, no endless scroll." },
];

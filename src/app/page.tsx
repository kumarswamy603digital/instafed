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
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <span className="text-2xl font-extrabold bg-instagram-gradient bg-clip-text text-transparent">
          InstaFed
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand hover:bg-brand-dark transition"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
          Your favorite creators&apos; videos,
          <span className="block bg-instagram-gradient bg-clip-text text-transparent">
            all in one feed.
          </span>
        </h1>
        <p className="mt-6 text-lg text-neutral-400 max-w-xl">
          Search Instagram accounts by username, subscribe to the ones you love,
          and browse every one of their videos and reels — no endless scrolling.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="px-8 py-3 rounded-xl text-base font-semibold bg-brand hover:bg-brand-dark transition"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl text-base font-medium border border-neutral-700 hover:bg-neutral-800 transition"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          {[
            { step: "1", title: "Search", body: "Find any Instagram handle by username." },
            { step: "2", title: "Subscribe", body: "Save the accounts you want to follow." },
            { step: "3", title: "Watch", body: "Browse all their videos in a clean grid." },
          ].map((f) => (
            <div
              key={f.step}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5"
            >
              <div className="w-8 h-8 rounded-full bg-instagram-gradient flex items-center justify-center font-bold text-sm">
                {f.step}
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="text-sm text-neutral-400 mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-neutral-600 py-8">
        InstaFed · Powered by Apify
      </footer>
    </main>
  );
}

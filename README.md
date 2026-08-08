# InstaFed

Search Instagram accounts by username, subscribe to the ones you care about, and
browse **all of their videos and reels** in a clean, self-hosted feed — powered by
[Apify](https://apify.com) for the scraping.

This implements the exact flow:

1. **Search** an Instagram handle by username.
2. **Subscribe** to that account (saved to your account in the database).
3. **Get every video** of that subscribed account and play them in-page.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Prisma** + **SQLite** for the database (users + subscriptions)
- **NextAuth (Auth.js v4)** — email/password accounts (credentials, JWT sessions)
- **Apify** (`apify/instagram-scraper`) for Instagram search + video scraping

The Apify token is only ever used **server-side** (inside API routes), so it is
never exposed to the browser.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`:

- `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`
- `APIFY_TOKEN` — your token from Apify Console → Settings → Integrations
- (optional) `APIFY_ACTOR_ID`, `APIFY_SEARCH_LIMIT`, `APIFY_VIDEOS_LIMIT`

> By default the app fetches **every** video for an account. Set
> `APIFY_VIDEOS_LIMIT` to a positive number only if you want to cap it
> (leaving it empty / `0` / `unlimited` means no limit).

> **No Apify token yet?** Leave `APIFY_TOKEN` empty (or set `MOCK_APIFY="true"`)
> and the app serves realistic **mock data** so you can explore the whole UI —
> including playable sample videos — without spending Apify credits.

### 3. Create the database

```bash
npx prisma db push
```

This creates `prisma/dev.db` (SQLite) and generates the Prisma client.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000, create an account, and start searching.

## How the Apify integration works

All Instagram data flows through `src/lib/apify.ts`, which calls the actor's
`run-sync-get-dataset-items` endpoint:

- **Search** — sends `{ search, searchType: "user", searchLimit }` and maps the
  results into account cards.
- **Videos** — sends `{ directUrls: ["https://www.instagram.com/<user>/"],
  resultsType: "posts", resultsLimit }`, keeps only video/reel posts, and maps
  them into playable cards.

Field mapping is intentionally defensive (it accepts several possible field
names), so it also works with most alternative Instagram scraper actors. If you
prefer a different actor, just set `APIFY_ACTOR_ID` in `.env`.

## Project structure

```
src/
  app/
    api/
      auth/[...nextauth]/route.ts   NextAuth handler
      register/route.ts             Create account
      search/route.ts               Search Instagram accounts (Apify)
      subscriptions/route.ts        List / add subscriptions
      subscriptions/[id]/route.ts   Remove a subscription
      videos/route.ts               Fetch a subscribed account's videos (Apify)
    dashboard/                      Protected app (search, subscriptions, videos)
    login/ · register/              Auth pages
  components/                       UI (cards, modal, nav, forms)
  lib/
    apify.ts                        Apify integration + mapping
    mock-data.ts                    Offline sample data
    auth.ts                         NextAuth config
    prisma.ts                       Prisma client singleton
    types.ts · format.ts            Shared types + formatters
prisma/schema.prisma                User + Subscription models
```

## Notes

- Videos can only be fetched for accounts you are subscribed to (enforced
  server-side).
- Private Instagram accounts generally cannot be scraped.
- Respect Instagram's Terms of Service and Apify's usage policies.

## Deploying

Deploys cleanly to any Node host (Vercel, Railway, Fly, a VPS, etc.). For
production, switch `DATABASE_URL` to a managed Postgres/MySQL and change the
Prisma `datasource` provider accordingly, then run `prisma migrate deploy`.
Remember to set `NEXTAUTH_URL` to your public URL and provide the same env vars.

# Mirra

**Your AI closet & stylist.** Catalog every piece you own, try outfits on your avatar (or a photo of you), and get an honest AI Fit Score with tips that actually make you look better.

Built with Next.js 15, Supabase, Groq vision models, remove.bg and Open-Meteo — everything runs on free tiers.

## Features

**Closet**
- Add pieces 3 ways: photo of the item (bulk, up to 12), full-body photo (AI finds and crops every piece), or a product link (JSON-LD / OpenGraph / Shopify import)
- Automatic background removal (remove.bg free previews) and AI tagging: category, colors, pattern, material, formality, seasons, tags, brand
- Search, filters (category, color family, season, favorites, laundry, not worn in 30 days), sorting, rainbow view, bulk actions
- Item pages with wear logging (+ undo), laundry status, wear goals, cost per wear, "goes well with", color companions and an AI care guide
- Laundry basket grouped into darks / lights / colors / dry cleaning

**Try-On & outfits**
- Customizable 2D avatar *or* your own photo as the canvas ("Mirror mode")
- Drag, resize, rotate and layer pieces; swipe through categories; lock pieces and Shuffle
- AI "Complete the look", instant harmony score, A/B compare, lookbooks
- Shareable Fit Card images

**Fit Check**
- Photo (or a saved outfit as a flat-lay) → score out of 100 with 5-part breakdown
- Honest, Hype or Roast mode — rates clothes, colors and styling only, never bodies
- Tips that link swaps from your own closet and suggest colors
- History with trend chart, caption generator for posting, hide-scores option

**Color analysis** — on-device selfie analysis (MediaPipe) → undertone, depth, contrast, one of 12 seasons, best colors / colors to avoid, best metals. The selfie never leaves the device.

**AI stylist** — chat that knows your closet, palette, style DNA and live weather; returns real outfits you can try on or save; voice input.

**Planner** — weather-aware outfit of the day, 7-day plan with auto-plan, repeat and weather warnings, AI packing lists built from your closet around the trip forecast.

**Smart shopping** — "Do I need this?" verdicts (match score, outfits unlocked, duplicates you own), gap finder, wishlist.

**Insights** — closet value, possible outfits, cost per wear, wear calendar heatmap, color story, category balance, spending vs monthly budget, declutter candidates, near-duplicates, streaks and badges.

**Style tools** — capsule wardrobe builder, Color Lab, "Which one?" photo decider, dress code decoder.

**App** — Home dashboard with getting-started checklist and "wear me" nudges, Ctrl/⌘K command palette, keyboard shortcuts (`?`), light/dark/system theme, installable PWA with offline page, data export (JSON/CSV), self-serve account deletion.

See [FEATURES.md](FEATURES.md) for the 100-idea list and the top 20 that were built.

## Tech stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Motion · Recharts · Supabase (Auth, Postgres with row-level security, private Storage) · Groq (`qwen/qwen3.8-27b` vision, `openai/gpt-oss-120b` text) · remove.bg · MediaPipe Face Landmarker · Open-Meteo

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your keys (see below)
npm run db:migrate             # creates tables, security rules, storage buckets
npm run dev
```

| Variable | Where to get it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys | ✅ |
| `SUPABASE_DB_URL` | Supabase → Connect → Session pooler (with your DB password) — only for `db:migrate` | ✅ once |
| `GROQ_API_KEY` | console.groq.com | ✅ |
| `REMOVE_BG_API_KEY` | remove.bg/api | optional (cutouts) |
| `GROQ_VISION_MODEL`, `GROQ_TEXT_MODEL` | override model ids | optional |

In Supabase → Authentication → URL Configuration, add your site URL (and `http://localhost:3000`) to the redirect allow-list so email confirmation links work.

## Deploying (Vercel, free)

1. Import the GitHub repo at vercel.com → New Project.
2. Add the environment variables above (everything except `SUPABASE_DB_URL`).
3. Deploy, then add the Vercel URL to Supabase → Authentication → URL Configuration (Site URL + Redirect URLs).

## Privacy & safety

- Every table uses row-level security; photos are in private buckets under each user's folder and served via short-lived signed URLs.
- Color analysis runs entirely in the browser.
- AI prompts forbid comments on bodies, weight or appearance — feedback is about clothing only.
- API routes are authenticated and rate-limited; link imports are SSRF-protected.

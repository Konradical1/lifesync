# LifeSync

An iPhone app for logging meals by photo, journaling and tracking the rest of your day, with AI that estimates nutrition and summarizes how the day went.

> The repo is named JournalX for historical reasons. The app started as "JournalX" in February 2026 and was renamed LifeSync before the TestFlight beta. Some internal names (the Expo slug `JournalX2`, the `@journalx_` storage prefix) still use the old name so existing installs keep their data.

**Beta:** [join on TestFlight](https://testflight.apple.com/join/39JxNPXm)

## What it does

- **Food logging by photo.** Snap a meal, pick a photo or type what you ate. The app returns a name, portion, a per-item breakdown, calories, protein, carbs, fat, fiber, sugar, sodium, a 1 to 10 health score and a one-line tip. If a nutrition label is in the photo it copies the label. For branded or restaurant food it uses the published numbers. Otherwise it estimates portions from visual cues.
- **Snap and go.** Logging never waits on the AI. Each meal goes into a local queue and is estimated in the background (up to 3 at a time). Without a connection, meals wait and retry later, and they keep the time you actually ate.
- **Corrections.** Add a note like "ate half" to a logged meal and it gets re-estimated from the earlier analysis.
- **Daily targets and coaching.** Targets come from the Mifflin-St Jeor equation, your activity level and a Gain / Maintain / Lose goal. The Today card shows progress, a day grade and an AI suggestion for the next meal or snack that closes the biggest gap.
- **The rest of the day.** Journal entries, mood, water, sleep, exercise (with AI fill from a text description), meds and other events, on a calendar day view with draggable blocks. Swipe between days on the home screen.
- **AI summaries and insights.** A short daily summary on the home screen and an Insights tab that looks across recent days.
- **Reminders.** Push notifications for a missing meal log, journal entry or low water.
- **Accounts.** Email and password, Sign in with Apple, or Google. Password reset with a 6-digit code in the app. Account deletion from Settings removes the user and all their rows.

## How it works

```
iPhone app (Expo / React Native)
   |  Supabase session token
   |-------------------------------> Supabase (Postgres + Auth, row level security)
   |
   |  Authorization: Bearer <token>
   '-------------------------------> Vercel serverless API (api/) ---> OpenRouter (AI models)
```

**App** (`App.js`, `src/`). Expo SDK 54, React Native 0.81, React Navigation tabs (Home, Insights, Add, Calendar, Settings). One store (`src/store/useStore.js`) holds the user's data, caches it on the device and syncs it to Supabase (`src/api/supabaseSync.js`). Photos are resized to 1024 px wide JPEGs before upload. The client only holds the Supabase URL and anon key, which are public by design.

**API** (`api/`, deployed on Vercel):

| Endpoint | What it does | Daily cap |
| --- | --- | --- |
| `POST /api/ai/food-photo` | Photo, typed meal or correction to structured nutrition | 40 per user |
| `POST /api/ai/food-coach` | One next-meal idea from today's totals and targets | 30 per user |
| `POST /api/ai/extract` | Exercise details from a sentence | |
| `POST /api/ai/summary`, `/api/ai/summary-short` | Day summary | |
| `POST /api/ai/insights` | Insights over recent events, journal and moods | |
| `POST /api/notifications/register` | Saves the Expo push token for the signed-in user | |
| `GET /api/notifications/cron` | Daily reminder job (Vercel Cron, checks `CRON_SECRET`) | |
| `GET /api/udid` | Device-ID sign-up page used for the ad hoc beta before TestFlight | |

Every AI endpoint goes through `api/_lib/auth.ts`, which verifies the Supabase session token, applies a 30 requests per minute per user limit and counts daily caps in the user's Supabase `app_metadata`. AI keys only exist as Vercel environment variables.

**AI providers.** All model calls go through [OpenRouter](https://openrouter.ai). Food uses `google/gemini-3.8-flash` with `openai/gpt-6-sol` as an automatic fallback, with strict JSON schema output (`api/_lib/openrouter.ts`). Summaries, insights and exercise fill use `openai/gpt-4.1-mini`. Food photo logging first ran on Claude and moved to OpenRouter in October 2026.

**Database** (`supabase/`). Tables for events, journal entries, summaries, mood, profile, water, push tokens and a notification log. Every table has row level security with owner-only policies, so a user's token can only read and write their own rows. Schema changes are numbered SQL migrations (`001` to `008`). The `delete-account` edge function deletes the auth user and foreign key cascades remove their data.

More detail and the main design decisions: [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

## Engineering notes

- **Tests.** `npm run test:nutrition` (31 assertions: goal math, height parsing including iOS smart quotes, food fields, day totals and the day grade) and `npm run test:store-merge` (4 assertions: merging server and local events, aborting a refresh when one table fails to load). Both run in plain Node with `node:assert`, because the logic lives in small CommonJS modules (`src/utils/nutrition.js`, `src/utils/goalSuggest.js`, `src/store/eventMerge.js`).
- **Backward compatible API.** Friends ran older builds while the API changed, so new endpoints return a superset of the old response and keep the old paths. Migration `008` (an `events.nutrition` jsonb column and profile goal fields) had to be applied before a new build could sync.
- **iOS 27 launch fix.** Apps built with the iOS 27 SDK must use the UIScene lifecycle, and Expo 54's template does not. `plugins/withSceneDelegate.js` is a config plugin that adds a SceneDelegate during `expo prebuild`.
- **Size.** About 17,000 lines of JavaScript, TypeScript and SQL, 46 commits from February to October 2026.

## Status

In beta on TestFlight: [public link](https://testflight.apple.com/join/39JxNPXm) (verified live 2026-11-01). Before that, friends installed ad hoc builds registered through `/api/udid`. Next up is a friends feed, in progress on a separate branch.

## How I built this

I set the direction and requirements, designed the features, handled the iOS build, signing and TestFlight pipeline, and tested on my phone and with friends. AI coding agents (Cursor early on, then OpenAI Codex and Claude Code) wrote most of the code, which is why many commits carry a `Co-Authored-By` trailer. The spec and implementation plan for the food logging rewrite are in [`docs/superpowers/`](docs/superpowers/).

## Running it

You need Node 20+, Xcode, a Supabase project, an OpenRouter key and (for the API) a Vercel account.

1. `npm install`
2. Database: run `supabase/migrations/001` to `008` in order in the Supabase SQL editor, and deploy `supabase/functions/delete-account`.
3. Copy `.env.example` to `.env` and fill in the app values (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, optionally `EXPO_PUBLIC_API_URL`).
4. API: set the server values from `.env.example` in Vercel, or put them in `.env.local` and run `npx vercel dev`.
5. App: `npm run ios` (`expo run:ios`) builds and runs a development build. `scripts/ios-device.sh` builds a Release app and installs it on a connected iPhone with a free Apple developer account.
6. Tests: `npm run test:nutrition` and `npm run test:store-merge`.

The app uses two commercial fonts (Bicyclette and Tanseek) that are licensed, not redistributable, so they aren't in this repo. To build, put your own licensed copies in `assets/fonts/` with the file names `App.js` loads, or swap those entries for any other font.

Setup notes for sign-in providers and the App Store are in [DEPLOYMENT.md](DEPLOYMENT.md). `SUPABASE_SETUP.md` and `docs/API_KEY_SETUP.md` are older notes from the JournalX version.

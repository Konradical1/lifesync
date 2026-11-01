# How LifeSync works

## The pieces

There are three parts.

1. **The iPhone app** (React Native with Expo). It shows your day, keeps a copy of your data on the phone so it opens instantly and works offline, and syncs changes to the database.
2. **The database** (Supabase, which is Postgres plus user accounts). Each table has row level security rules that say "a row can only be read or written by the user who owns it". The app talks to the database directly with the signed-in user's token, so those rules are what keep one user's journal away from another.
3. **A small API** (serverless functions on Vercel). Anything that costs money or needs a secret goes through here: the AI calls and push notifications. The app sends its login token, the API checks it with Supabase, then calls the AI model through OpenRouter and sends back JSON.

Logging a meal: you take a photo, the app shrinks it to a 1024 px JPEG and puts it in a local queue with the current time. A background worker sends it to `/api/ai/food-photo`. The API checks your token and your daily cap, asks the model for nutrition in a fixed JSON shape, and returns it. The app turns the answer into a food event, saves it on the phone and syncs it to the database.

## Key decisions

**1. Secrets never ship in the app.** Anything inside an iPhone app can be extracted, so the AI keys and the Supabase service key only live in Vercel. Every AI endpoint requires a valid login, has a 30 requests per minute limit per user, and has a daily cap (40 food estimates, 30 coach ideas). The daily count is stored in the user's account metadata instead of a new table. That is a read-then-write, so two requests at the same instant could both slip through. That is fine for cost control and kept the code small.

**2. Logging doesn't wait for the AI.** In the first version, snapping a meal opened a screen that waited for the estimate before you could save it, and only offline meals were queued. Now every meal goes into a queue on the phone and you stay on the home screen. Up to 3 are estimated at once in the background, and offline items retry later. Each meal keeps the time it was eaten, not the time the AI answered.

**3. Structured output and a fallback model.** The food prompt asks for a strict JSON schema (calories, macros, items, health score, tip), so the app never parses free text. OpenRouter tries Gemini 3.8 Flash first and falls back to GPT-6 Sol if it fails. I switched from Claude when my API credits were ending. In a 6-photo test Gemini matched a Big Mac, an FDA nutrition label and a Starbucks drink exactly, in about 4.5 seconds and about $0.0025 per scan.

**4. Don't break the phones already in people's hands.** Friends were running older builds, and an iPhone app can't be force-updated. So the API keeps its old paths and returns a superset of the old response, the database rules stayed owner-only, and a schema change (migration 008) is applied before the build that needs it goes out.

## How I check it

The nutrition math (targets from height, weight, age, activity and goal, plus totals and the day grade) and the sync merge logic are plain functions with tests that run in Node: `npm run test:nutrition` and `npm run test:store-merge`. UI changes were checked in the iOS simulator and on my own phone.

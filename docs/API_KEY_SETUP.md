# Where to Put the OpenRouter API Key

**Never put the API key in your app code or in git.** It goes only in your **backend** environment.

## 1. Get a key

1. Go to [OpenRouter](https://openrouter.ai/).
2. Sign in and create an API key (e.g. `sk-or-v1-...`).

## 2. Add it in Vercel (recommended)

1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your **project** (the one that contains this repo).
3. Go to **Settings → Environment Variables**.
4. Add:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** `sk-or-v1-your-actual-key-here`
   - **Environments:** Production, Preview, Development (or at least Production).
5. Save and **redeploy** the project so the new variable is applied.

The serverless function in `api/ai/extract.ts` reads the key with `process.env.OPENROUTER_API_KEY`. It never appears in the Expo app or in the browser.

## 3. Optional: local development

If you run the API locally (e.g. `vercel dev`):

- Create a file `.env.local` in the **project root** (same folder as `package.json`).
- Add: `OPENROUTER_API_KEY=sk-or-v1-your-key`
- **Do not commit `.env.local`** — add it to `.gitignore` if it isn’t already.

## 4. Point the Expo app at your API

The app calls your backend at the URL in `src/api/config.js` (`API_BASE_URL`). After you deploy to Vercel:

1. Copy your deployment URL (e.g. `https://journalx2-xxx.vercel.app`).
2. In `src/api/config.js`, set `API_BASE_URL` to that URL, **or** set `EXPO_PUBLIC_API_URL` in your environment so the app uses it at build time.

The API key is only on the server; the app only needs the **base URL** of your Vercel project.

## Summary

| Place                         | Use it? |
|------------------------------|--------|
| Vercel → Project → Settings → Environment Variables | ✅ Yes – production and preview |
| `.env.local` in project root (for `vercel dev`)     | ✅ Yes – local only, do not commit |
| In Expo app / `config.js` / any frontend code       | ❌ No – key stays on server only |
| In repo or any file you commit                       | ❌ No – never commit secrets     |

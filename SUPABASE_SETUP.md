# Supabase Setup for JournalX2

## 1. Create tables

In **Supabase Dashboard → SQL Editor**, run the contents of:

1. `supabase/migrations/001_initial_schema.sql`
2. If you already had the schema, run `supabase/migrations/003_mood_history_summary_no_overwrite.sql` (enables mood history)
3. Run `supabase/migrations/004_mood_start_end_time.sql` (adds start/end time for mood timeline)

## 2. Enable Anonymous Auth

In **Supabase Dashboard → Authentication → Providers**, enable **Anonymous** sign-ins. The app uses anonymous auth to scope data per device without requiring sign-up.

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

- **EXPO_PUBLIC_SUPABASE_URL**: Your project URL (e.g. `https://levejzunkzkpevirmbah.supabase.co`)
- **EXPO_PUBLIC_SUPABASE_ANON_KEY**: From **Project Settings → API → anon public**

> ⚠️ Use the **anon key**, not the database password. The PostgreSQL connection string is for direct DB access; the app uses the REST API with the anon key.

## 4. Restart the app

After adding `.env`, restart Expo so it picks up the new variables:

```bash
npx expo start --clear
```

---

**Without Supabase configured**, the app falls back to local mock data (no sync).

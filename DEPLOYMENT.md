# LifeSync — TestFlight Deployment Checklist

Everything code-side is done. This file lists the console/dashboard steps only
you can do (they need your logins), in order. Total time: roughly 30–40 minutes.

Supabase project: **LifeSync** (`pqtjigcfzhqveyqxuwau`) — your `.env` already
points at it, the schema + RLS are applied, and the `delete-account` edge
function is deployed.

---

## 1. Supabase dashboard (~10 min)

Open https://supabase.com/dashboard/project/pqtjigcfzhqveyqxuwau

### a. Enable Apple Sign-In
Authentication → Sign In / Providers → **Apple** → enable.
- In **Authorized Client IDs** enter: `com.konradfischer.lifesync`
- Nothing else needed for native iOS (no Service ID / secret — that's only for web).

### b. Enable Google Sign-In (after step 2 below)
Authentication → Sign In / Providers → **Google** → enable.
- In **Authorized Client IDs** enter BOTH, comma-separated: the **Web client ID**
  and the **iOS client ID** from step 2.
- Turn ON **Skip nonce checks** (the native Google SDK doesn't send a nonce —
  sign-in fails without this).

### c. Password reset email → code instead of link
Authentication → Emails → Templates → **Reset Password**: replace the link with
a code so reset works fully in-app. Example body:

```html
<h2>Reset your LifeSync password</h2>
<p>Your reset code is:</p>
<h1>{{ .Token }}</h1>
<p>Enter this code in the app. It expires in 1 hour.</p>
```

### d. (Optional, recommended for TestFlight)
Authentication → Sign In / Providers → Email: turn OFF "Confirm email" while
testing so testers aren't blocked by confirmation emails from the default
Supabase sender.

## 2. Google Cloud Console (~10 min — the copy-paste job)

1. https://console.cloud.google.com → create project **LifeSync**.
2. **APIs & Services → OAuth consent screen**: External, app name `LifeSync`,
   your support email, save. (You can stay in "Testing" mode and add your own
   Google account as a test user for now.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, twice:
   - Type **iOS**: bundle ID `com.konradfischer.lifesync`.
     Copy the **Client ID** and the **iOS URL scheme** it shows
     (looks like `com.googleusercontent.apps.xxxx`).
   - Type **Web application**: name it "LifeSync Supabase". Copy the **Client ID**.
4. Add to your local `.env` (exact keys, no quotes):

```
GOOGLE_WEB_CLIENT_ID=<web client id>.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=<ios client id>.apps.googleusercontent.com
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<ios client id>
```

5. Paste both client IDs into Supabase (step 1b).

The Google button hides itself until these are set, so nothing breaks meanwhile.

## 3. Vercel (~5 min)

Project settings → Environment Variables — make sure these exist and point at
the **new LifeSync** Supabase project (not the old JournalX one):

```
SUPABASE_URL=https://pqtjigcfzhqveyqxuwau.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase dashboard → Project Settings → API keys → service_role>
OPENROUTER_API_KEY=<existing>
CRON_SECRET=<any long random string, protects the notification cron>
```

Then push this repo to git so Vercel deploys the secured endpoints.
⚠️ The API now requires sign-in — old app builds get 401s from AI features
after this deploy, so push it when you build the new app version.

## 4. App Store Connect (~10 min)

1. https://appstoreconnect.apple.com → My Apps → **+ New App**:
   platform iOS, name **LifeSync**, bundle ID `com.konradfischer.lifesync`
   (if the bundle ID isn't listed, the first `eas build` registers it for you —
   do step 5 first, then come back).
2. **App Privacy**:
   - Privacy policy URL: `https://www.konradfischer.com/lifesync/privacy` (already live)
   - Data collected: Contact Info (email, name), Health & Fitness (wellness logs),
     Sensitive Info (medical notes), Identifiers (user ID) — all "linked to the
     user's identity", none "used for tracking".
3. Sign in with Apple + Push Notifications capabilities: EAS configures these
   automatically from the app config during the build.

## 5. Build & submit to TestFlight

```powershell
npm install -g eas-cli
eas login

# Upload your .env values to EAS so cloud builds get them
# (local .env is gitignored and never uploaded automatically):
eas env:push production --path .env

eas build --platform ios --profile production   # first run walks you through Apple credentials + APNs key
eas submit --platform ios --latest
```

Then App Store Connect → TestFlight → add yourself as an internal tester.

## 6. Local dev notes

- Two native modules were added (Apple + Google sign-in), so rebuild your dev
  app once: `npx expo run:ios`. Until then the social buttons stay hidden.
- App icon: `assets/icon.png` (1024×1024) is picked up automatically. Apple
  rejects icons with transparency — if App Store Connect complains, flatten it
  onto a solid background.
- The Expo project slug is still `JournalX2` on expo.dev (renaming it is
  optional and cosmetic; the app name users see is LifeSync).
- Local AsyncStorage keys still use the `@journalx_` prefix on purpose — 
  changing them would wipe existing local data.

## What was changed in code (already done)

- **Rebrand/config**: name LifeSync, bundle `com.konradfischer.lifesync`,
  buildNumber, `lifesync://` scheme, Face ID usage string, encryption-exempt flag.
- **Apple Sign-In** + **Google Sign-In** via Supabase `signInWithIdToken`
  (buttons on Sign In & Create Account screens).
- **Removed** the "Skip for local preview" auth bypass.
- **Forgot password**: in-app email → 6-digit code → new password flow.
- **API security**: all `api/ai/*` + push-token registration now require your
  Supabase session token and are rate-limited (30 req/min/user); push tokens
  can no longer be registered for another user.
- **Account deletion**: Settings → Delete Account (double confirmation) →
  `delete-account` edge function (deployed) → deletes auth user, cascades wipe
  all rows. Satisfies App Store guideline 5.1.1(v).
- **eas.json** with development / preview / production profiles.

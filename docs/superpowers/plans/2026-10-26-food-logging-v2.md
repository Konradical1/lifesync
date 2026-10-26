# Food Logging v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snap-and-go food logging (a photo or a typed meal goes into a background queue and the user stays on Home), full nutrition per meal with a day grade and "what to eat next" coaching for someone trying to eat more and eat healthier, and the food AI moved off Claude onto OpenRouter.

**Architecture:** A small OpenRouter helper (`api/_lib/openrouter.ts`) backs the existing `/api/ai/food-photo` endpoint, which now takes a photo, typed text or a correction and returns a superset of today's JSON, plus a new `/api/ai/food-coach`. The app turns every estimate into food-event fields (`foodFields` in `src/utils/nutrition.js`). The queue (`src/store/pendingFood.js`) adds each meal with `ADD_EVENT`, with no confirm step. Pure CommonJS math (`goalSuggest.js`, `nutrition.js`) drives the targets, the day grade and the gap line, and one node script checks it. The extra nutrients go in a new `events.nutrition jsonb` column, so older builds keep working.

**Tech Stack:** Expo SDK 54 / React Native 0.81 (plain JS, Reanimated 4, expo-haptics, React Navigation 7.1), Vercel Node functions (TypeScript, plain `fetch`), OpenRouter chat completions with strict JSON schema, Supabase Postgres via PostgREST.

**Source of truth:** `docs/superpowers/specs/2026-10-26-food-logging-v2-design.md`. Where this plan and the spec disagree, the spec wins; report the conflict.

## Global Constraints

- Repo: `~/path`, branch `food-v2`, worked in place. Always use absolute paths.
- `SCRATCH` = `/tmp/scratch`. Every scratch file goes there, never in the repo. Shell state does not persist between tool calls, so start every command that uses `$SCRATCH` with `SCRATCH=/tmp/scratch`.
- **Do NOT commit, push or deploy.** Do not change Vercel env vars. Do not touch the live Supabase database (the migration is only written). Do not run `expo prebuild`, `xcodebuild` or `pod install`. Leave all changes uncommitted.
- **No new npm dependencies.** Removing `@anthropic-ai/sdk` is required.
- Food AI goes through OpenRouter only: `models: [FOOD_MODEL || "google/gemini-3.8-flash", FOOD_FALLBACK_MODEL || "openai/gpt-6-sol"]`, `reasoning: { effort: "low" }`, strict `response_format` json_schema, and `provider: { require_parameters: true }`.
- Remove Claude completely. No `anthropic` or `claude` mentions may remain in code or comments outside `node_modules` and `docs/superpowers`.
- **Backward compatible API.** Friends run older builds that call `/api/ai/food-photo` with `{ image, note }` and read `data.{is_food,name,portion,source,items,calories,protein,carbs,fat}`. Those must keep working: add fields only, and error bodies stay `{ error: string }`. `/api/ai/extract` is untouched; old builds and the exercise flow still use it.
- Do not refactor the four existing OpenRouter endpoints (`extract.ts`, `summary.ts`, `summary-short.ts`, `insights.ts`).
- Daily quotas: `food_photo` 40 (photos, typed meals and corrections all count) and `food_coach` 30.
- Units: grams and kcal are integers, sodium is integer mg, and `health_score` is an integer from 1 to 10.
- Style: match the surrounding file (quote style, 2-space indent, sparse comments, `StyleSheet.create` at the bottom, named constants such as `SCREEN_MARGIN`). Reuse before writing: `Card`, `StatBar`, `SkeletonBar`, `SegmentedControl`, `useTheme()` (`palette`, `text`, `shape`), `formatTime12h`/`getTimeNow24h`, the `FoodScan` pieces, and the Reanimated + `expo-haptics` patterns already in `FoodLog.js`/`FoodEventScreen.js`.
- Never print API keys. For live tests, load `OPENROUTER_API_KEY` in a subshell from `"$HOME/Library/Application Support/Jarvis/jarvis.env"`. The account has about $0.17 left, so keep live spend **under $0.03 per unit**.
- Edit only the files your unit owns (table below). If you believe another file must change, stop and report instead of editing it.

## Units, order and file ownership

| Unit | Starts | Owns (nobody else edits these) |
|---|---|---|
| **A-api** | immediately, in parallel with B | `api/_lib/openrouter.ts` (new), `api/ai/food-photo.ts`, `api/ai/food-coach.ts` (new), `package.json`, `package-lock.json`, `vercel.json`, plus extra files `api/_lib/auth.ts` and `vercel.d.ts` |
| **B-data** | immediately, in parallel with A | `supabase/migrations/008_food_nutrition.sql` (new), `src/api/supabaseSync.js`, `src/utils/goalSuggest.js`, `src/utils/nutrition.js` (new), `scripts/test-nutrition.cjs` (new), `src/api/ai.js`, `src/api/config.js`, `src/store/useStore.js` |
| **C-queue** | after B finishes | `src/store/pendingFood.js`, `src/components/Home/FoodLog.js`, `src/utils/pickFoodPhoto.js` |
| **D-detail** | after B finishes | `src/screens/EventScreens/FoodEventScreen.js`, `src/components/Food/FoodScan.js`, `src/components/Calendar/EventEditSheet.js`, `src/components/Calendar/EventCard.js`, `src/navigation/HomeStack.js`, `src/navigation/AddEventStack.js`, plus extra file `src/navigation/CalendarStack.js` |
| **E-today** | after B finishes | `src/components/Home/TodayNutrition.js` (new), `src/components/Home/CalorieProteinGoals.js` (delete), `src/screens/HomeScreen.js`, `src/components/Home/StatBar.js` |
| **F-profile** | after B finishes | `src/screens/ProfileScreen.js`, `src/components/Profile/AboutYouSection.js`, `src/components/Profile/QuickStatsRow.js`, `src/screens/SettingsScreen.js` |

**Expected transient breakage.** B deletes `extractFood` and `analyzeFoodPhoto` from `src/api/ai.js`, and `useTodayCaloriesAndProtein` from `src/store/useStore.js`. Until C, D and E land, `pendingFood.js`, `FoodEventScreen.js`, `EventEditSheet.js` and `CalorieProteinGoals.js` reference names that no longer exist. Metro does not check named imports at bundle time, so `expo export` still passes. The app only has to run once every unit is done. Each owner removes the stale references in its own files.

**Baseline facts (checked 2026-10-26).**
- `npx expo export --platform ios` passes in about 12 s.
- `npm run test:store-merge` passes.
- `npx tsc --noEmit` fails with exactly 3 pre-existing errors: `api/udid.ts` calls `res.send`, which `vercel.d.ts` does not declare. A fixes this in A1.

---

## Contracts (pinned; every unit codes against these exactly)

### K1. Food event (store shape, synced to `public.events`)

```js
{
  id: 'e_<Date.now()>_<6-8 random base36 chars>',
  type: 'food',                       // EVENT_TYPES.food
  date: 'YYYY-MM-DD',                 // local date the meal was snapped or typed (queue keeps the original)
  time: 'HH:mm',                      // 24h local time
  description: "McDonald's Big Mac",  // meal name (API `name`)
  note: '1 burger (219 g)',           // portion (API `portion`); ' × 1.5' appended when saved at servings ≠ 1; undefined when empty
  calories: 590,                      // int kcal
  protein: 25, carbs: 46, fat: 34,    // int g
  nutrition: {                        // OPTIONAL: absent on meals logged by older builds or written by Jarvis
    fiber: 3,                         // int g
    sugar: 9,                         // int g, total sugars
    sodium: 1050,                     // int mg
    health_score: 4,                  // int 1-10, or null
    feedback: 'Add a side salad for fiber.',  // one sentence, '' when none
    items: [{ name: 'Big Mac', portion: '1 burger', calories: 590 }],
    source: 'brand',                  // 'label' | 'brand' | 'estimate'
  },
}
```

- DB: `events.nutrition jsonb` maps to `event.nutrition`, with the same keys (`health_score` stays snake_case). Every other column is unchanged: calories, protein, carbs and fat keep their int columns and the portion stays in `note`, so older builds still read them.
- Code that reads nutrients must tolerate a missing `nutrition` (treat the nutrients as 0, and hide the health chip, feedback and items).
- Never invent a `nutrition` object for an old meal unless a nutrient is edited or a correction runs.

### K2. Profile fields (`state.profile`, table `public.profile`)

| JS field | DB column | Values | Load (DB → JS) | Save (JS → DB) |
|---|---|---|---|---|
| `goalType` | `goal_type text` | `'gain'` \| `'maintain'` \| `'lose'` | `p.goal_type \|\| 'gain'` | `profile.goalType \|\| null` |
| `sex` | `sex text` | `'male'` \| `'female'` \| `''` | `p.sex ?? ''` | `profile.sex \|\| null` |
| `activity` | `activity text` | `'sedentary'` \| `'light'` \| `'moderate'` \| `'active'` \| `''` | `p.activity ?? ''` | `profile.activity \|\| null` |
| `carbGoal` | `carb_goal int` | numeric string or `''` | `String(n)` or `''` | int or null |
| `fatGoal` | `fat_goal int` | numeric string or `''` | same | same |
| `fiberGoal` | `fiber_goal int` | numeric string or `''` | same | same |

- The existing fields are unchanged: `calorieGoal`↔`calorie_goal`, `proteinGoal`↔`protein_goal`, `waterGoalOz`↔`water_goal_oz`, `weight` (a pounds string such as `"154"`), `height` (free text such as `5'10"`), `age`, and `gender` (local-only free text that stays as is).
- `initialState.profile.goalType` is `'gain'`, so `profile.goalType` is always set. The default is Gain for Konrad's flow.
- An empty saved goal means "use the suggestion" (see `dailyTargets`).

### K3. Store (`src/store/useStore.js`)

The reducer is unchanged. The payloads are:

- `dispatch({ type: 'ADD_EVENT', payload: FoodEvent })` takes a full K1 event with an `id`.
- `dispatch({ type: 'UPDATE_EVENT', payload: { id, ...changedFields } })` does a **shallow** merge, so always pass the whole `nutrition` object when any nutrient changes.
- `dispatch({ type: 'DELETE_EVENT', payload: { id } })` only removes the event locally. Every delete must also remove the server row, exactly like `EventEditSheet.handleDelete`:
  ```js
  dispatch({ type: 'DELETE_EVENT', payload: { id } });
  if (isSupabaseConfigured()) deleteEventFromSupabase(id).catch(() => {});
  ```
  The imports are `isSupabaseConfigured` from `src/api/supabase` and `deleteEventFromSupabase` from `src/api/supabaseSync`.
- `dispatch({ type: 'UPDATE_PROFILE', payload: { [field]: value } })` takes K2 values; numeric goals are strings.

The hooks are:

- `useStore()` and `useEvents(date?)` are unchanged.
- **New:** `useTodayFood()` returns `{ date: 'YYYY-MM-DD', meals: FoodEvent[] (today's food events, unsorted), totals: dayTotals(meals) }`.
- **Removed:** `useTodayCaloriesAndProtein()`. E deletes its only consumer.
- `StoreProvider` still calls `startPendingFoodSync(dispatch)` once on mount.

### K4. Pure modules: `src/utils/goalSuggest.js` and `src/utils/nutrition.js`

These are **CommonJS** (`'use strict'` + `module.exports`), like `src/store/eventMerge.js`, so that `scripts/test-nutrition.cjs` can load them in plain node. App code consumes them with `require`, the same way `useStore.js` already loads `eventMerge`:

```js
const { dailyTargets, dayGrade, gapLine, healthTone } = require('../../utils/nutrition'); // path relative to the caller
```

| Export | Signature → return |
|---|---|
| `suggestGoals(profile)` (goalSuggest) | `→ { calories, protein, carbs, fat, fiber, sugarMax, sodiumMax }` or `{ error: string }`. Mifflin-St Jeor × activity factor (sedentary 1.2, light 1.375, moderate 1.55 default, active 1.725). gain +400 kcal and 1.8 g/kg protein (the default goal); maintain 1.6 g/kg; lose −500 kcal and 2.0 g/kg. Fat is 30% of kcal, carbs the remainder, fiber 14 g per 1000 kcal clamped to 25–45, sugarMax 10% of kcal ÷ 4, sodiumMax 2300. Unset sex uses the male constant. **Weight is pounds** unless it says kg. A bare height under 100 is inches. |
| `macroSplit(calories, protein)` (goalSuggest) | `→ { carbs, fat, fiber, sugarMax }` |
| `SODIUM_MAX_MG` (goalSuggest) | `2300` |
| `foodFields(apiData)` | food-photo `data` → `{ description, note, calories, protein, carbs, fat, nutrition }` (K1 fields). Clamps numbers to non-negative ints, clamps `health_score` to 1–10 (or null), and defaults `source` to `'estimate'`. |
| `dayTotals(meals)` | `→ { calories, protein, carbs, fat, fiber, sugar, sodium }`. Missing values count as 0. |
| `dailyTargets(profile)` | `→ { calories, protein, carbs, fat, fiber, sugarMax, sodiumMax }`. A saved `calorieGoal`/`proteinGoal`/`carbGoal`/`fatGoal`/`fiberGoal` wins. Otherwise the value comes from `suggestGoals`, else the defaults of 2000 kcal and 120 g protein. Carbs, fat, fiber and sugarMax are re-derived from the final calories and protein. |
| `dayGrade(meals, targets, { goal, hour })` | `→ { letter: 'A'\|'B'\|'C'\|'D'\|'F', score: 0-100, reason: string }`, or `null` when there are no meals. `goal` defaults to `'gain'`. `hour` is the local fractional hour, e.g. `13.5`. Spec weights apply; pace = clamp((hour − 7) / 13, 0.25, 1); components without data (no health scores) are dropped and the weights renormalized. |
| `gapLine(totals, targets)` | `→ '~60 g protein · 15 g fiber · 900 kcal to go'`, or `null` once the protein, fiber and kcal gaps are closed |
| `healthTone(score)` | `→ 'green'` (7+) \| `'orange'` (4–6) \| `'red'` (1–3) \| `null` (no score). Use as `palette[tone]`. |

### K5. App AI client: `src/api/ai.js` and `src/api/config.js`

- `prepareFoodPhoto(uri) → Promise<string>` (base64 JPEG, 1024 px) is **unchanged**.
- **New** `analyzeFood(input)` POSTs to `AI.foodPhoto`.
  - `input` is `{ image?, text?, note?, goal?, previous? }`. It is used three ways:
    - photo: `analyzeFood({ image, goal })`
    - typed meal: `analyzeFood({ text, goal })`
    - correction: `analyzeFood({ previous: { name: event.description, portion: event.note || '', items: event.nutrition?.items || [] }, note, goal })`
  - It resolves to `{ ok: true, data: { description, note, calories, protein, carbs, fat, nutrition } }` (K1 fields via `foodFields`) or `{ ok: false, error: string, offline?: true }`.
  - `offline: true` means the request got no usable answer: a network error, the 30 s client timeout, or a non-JSON body. The caller may retry later.
  - `is_food: false` resolves to `{ ok: false, error: "Couldn't find any food there. Try a closer photo or describe it." }`.
- **New** `getFoodIdea(payload)` POSTs to `AI.foodCoach` with a 20 s timeout.
  - `payload` is the K11 request body.
  - It resolves to `{ ok: true, idea: string }` or `{ ok: false, error: string }`.
- **Removed:** `extractFood` and `analyzeFoodPhoto`.
- **Unchanged:** `extractExercise`, `getDaySummary`, `getDaySummaryShort` and `getInsights`.
- `config.js` adds ``AI.foodCoach: `${API_BASE_URL}/api/ai/food-coach```.

### K6. Food queue: `src/store/pendingFood.js`

Item shape (persisted in AsyncStorage `@lifesync_pending_food`, same key as today):

```js
{ id: 'p_<ms>_<5 chars>', image?: string /* base64 JPEG */, text?: string, date: 'YYYY-MM-DD', time: 'HH:mm',
  goal?: 'gain'|'maintain'|'lose', status: 'analyzing' | 'waiting' | 'error', error?: string /* only for 'error' */ }
```

| Export | Behaviour |
|---|---|
| `usePendingFood()` | → `Item[]` (insertion order; React re-renders on change) |
| `queueFood({ image?, text?, date, time, goal? })` | Adds an item with status `'analyzing'`, **fires the light haptic itself** (callers must not add another), and starts work right away when the store is mounted |
| `retryPending(id)` | `'error'`/`'waiting'` → `'analyzing'`, then runs |
| `removePending(id)` | Drops the item. If it is in flight, the result is discarded and never added. |
| `clearPendingFood()` | Drops everything. Called on sign-out and on account deletion. |
| `startPendingFoodSync(dispatch)` | **Same signature as today.** Loads saved items (old items without a status become `'error'` if they had an `error`, else `'analyzing'`; ids are deduped) and retries `'waiting'` items on reconnect, on app foreground and every 60 s. Returns cleanup. |
| ~~`isOnline`~~ | **Removed.** The queue handles offline itself. |

Queue rules:
- At most 3 requests run in parallel.
- A success dispatches `ADD_EVENT` with `{ id, type: 'food', date, time, ...analyzeFood.data }`; when the description is empty it falls back to the item text, then to `'Meal'`. The item is then removed and a success haptic fires.
- `offline` → `'waiting'` (never loops).
- Any other failure → `'error'` with the API message.

### K7. Meal detail route

- Route name **`FoodEvent`**, screen `FoodEventScreen`.
  - Params `{ eventId: string }` open **detail mode** (view and edit a logged meal).
  - **No params** open **add mode** (snap, upload or describe a meal, which then goes into the queue).
  - The old `photoUri` param is gone.
- It is registered in `HomeStack` (exists), `AddEventStack` (exists) and **`CalendarStack`** (D adds it).
- Who navigates there:

  | From | Call | Owner |
  |---|---|---|
  | Home `TodayMeals` meal row | `navigation.navigate('FoodEvent', { eventId: meal.id })` | C |
  | Home `FoodCapture` "describe" button | `navigation.navigate('FoodEvent')` | C |
  | Calendar `EventEditSheet` food "Meal details" button | `navigation.navigate('FoodEvent', { eventId: event.id })` | D |
  | Add tab `EventTypeList` | `navigation.navigate('FoodEvent')`, unchanged | — |

- Pending queue rows are **not** tappable into detail.

### K8. Home components

- `src/components/Home/TodayNutrition.js` has a default export `TodayNutrition({ animTrigger = 0, loading = false })`. It replaces `CalorieProteinGoals` at the same spot in `HomeScreen`.
- `src/components/Home/FoodLog.js` keeps its named exports `FoodCapture` and `TodayMeals`, both without props. HomeScreen's import line does not change.
- `src/components/Food/FoodScan.js` keeps exporting `foodStreak`, `ScanOverlay`, `NutritionReveal` and `TEXT_STAGES`. `LoggedCelebration` is removed.

### K9. Checks

- npm script **`test:nutrition`** = `node scripts/test-nutrition.cjs`. A adds the script line; B writes the file, and until A's line exists B runs `node scripts/test-nutrition.cjs` directly. It prints `LifeSync nutrition tests passed`.
- Bundle check (every unit that touches `src/`): `cd ~/path && npx expo export --platform ios --output-dir "$SCRATCH/export-<unit>"`, which must exit 0. Never let it write `dist/` into the repo. If parallel units collide on Metro's cache or `node_modules` (A runs `npm uninstall`), re-run it once.
- The queue harness (one-off, not committed) lives at `$SCRATCH/queue-harness/harness.mjs`.
- API checks (one-off, not committed) live at `$SCRATCH/api-checks/offline.ts` and `$SCRATCH/api-checks/live.ts`.

### K10. HTTP: `POST /api/ai/food-photo` (path kept)

- Request headers: `Authorization: Bearer <Supabase JWT>` and `Content-Type: application/json`.
- Request body:

  ```json
  { "image": "<base64 JPEG, optional, ≤ 3,000,000 chars>",
    "text": "<typed meal, optional; trimmed, first 500 chars used>",
    "note": "<optional; trimmed, first 300 chars used>",
    "goal": "gain | maintain | lose (optional; anything else is ignored)",
    "previous": { "name": "...", "portion": "...", "items": [{ "name": "...", "portion": "...", "calories": 590 }] } }
  ```

  - At least one of `image`, `text` or `previous` is required, else 400 `"Send a photo or a description"`.
  - `previous` + `note` without an image is a correction; `previous` fields are capped at 100 chars and 15 items.
  - Old builds send `{ image, note }`, which still works.
- 200 response (a superset of the old shape):

  ```json
  { "ok": true, "data": { "is_food": true, "name": "McDonald's Big Mac", "portion": "1 burger (219 g)", "source": "brand",
    "items": [{ "name": "Big Mac", "portion": "1 burger", "calories": 590 }],
    "calories": 590, "protein": 25, "carbs": 46, "fat": 34, "fiber": 3, "sugar": 9, "sodium": 1050,
    "health_score": 4, "feedback": "Dense in calories and protein; add a side salad for fiber." } }
  ```

- Errors are always `{ "error": string }`:
  - 405 for a non-POST
  - 401 when unauthenticated
  - 429 for the per-minute rate limit, the daily quota (40) or OpenRouter 429 (`"AI is busy, try again in a moment"`)
  - 400 for missing input
  - 413 for an image that is too large
  - 500 for a server misconfiguration
  - 502 for an unreadable AI output (`"Couldn't read the AI response"`)
  - **503 for OpenRouter 402, 5xx or any other non-OK (`"AI is unavailable, try again later"`)**
  - 504 for the 25 s upstream timeout (`"AI took too long, try again"`)

### K11. HTTP: `POST /api/ai/food-coach` (new)

- Request body:

  ```json
  { "goal": "gain",
    "targets": { "calories": 3019, "protein": 126, "carbs": 402, "fat": 101, "fiber": 42, "sugarMax": 75, "sodiumMax": 2300 },
    "totals": { "calories": 590, "protein": 25, "carbs": 46, "fat": 34, "fiber": 3, "sugar": 9, "sodium": 1050 },
    "meals": [{ "name": "McDonald's Big Mac", "calories": 590, "protein": 25, "health_score": 4 }],
    "localTime": "15:30" }
  ```

  - `targets` is `dailyTargets(profile)`; `totals` and `meals` come from `useTodayFood()`.
  - `meals[].health_score` is `nutrition?.health_score ?? null`.
  - `localTime` is `getTimeNow24h()`.
- 200 response: `{ "ok": true, "idea": "Greek yogurt with granola, berries and almonds (~450 kcal, 25 g protein, 6 g fiber)." }`. The idea is 25 words or fewer.
- Errors match K10. The daily quota key is `food_coach`, max 30.

### K12. Shared UI conventions

| Nutrient | Color |
|---|---|
| calories | `palette.green` |
| protein | `palette.orange` |
| carbs | `palette.cyan` |
| fat | `palette.purple` |
| fiber | `palette.indigo` |

Sugar and sodium are caps: they show in `palette.secondaryLabel`, or `palette.red` when the total is over the max. (The protein, carbs and fat colors match `NutritionReveal`.)

**Health chip (C and D render the same thing):**
- A small pill with background `palette[tone] + '29'` (same hex-alpha trick as `EventCard`), `text.caption` in `palette[tone]`, and the content `` `${score}/10` ``.
- `tone = healthTone(score)`.
- Not rendered when the tone is `null`.

**Grade badge colors:** A and B use `palette.green`, C uses `palette.orange`, D and F use `palette.red`.

**Haptics:**
- `queueFood` fires `Haptics.impactAsync(Light)`.
- A meal landing in the queue fires `notificationAsync(Success)`.
- A detail-screen save or correction success fires `notificationAsync(Success)`.
- Errors fire `notificationAsync(Error)`.

---

## Unit A-api

**Files:**
- Create: `api/_lib/openrouter.ts` and `api/ai/food-coach.ts`.
- Rewrite: `api/ai/food-photo.ts`.
- Modify:
  - `package.json` and `package-lock.json` (via npm)
  - `vercel.json`
  - `vercel.d.ts` (one line)
  - `api/_lib/auth.ts` (one string)

**Interfaces:**
- Consumes: `requireUser(req, res, { key, max })` from `api/_lib/auth.ts`, unchanged.
- Produces:
  - K10 and K11.
  - `api/_lib/openrouter.ts` exports `AiError`, `openRouterJson<T>(opts)` and `sendAiError(res, err)`.
  - `food-photo.ts` exports `systemPrompt(goal?)`, `estimateFood(input)` and `type FoodInput`, plus the default handler.
  - `food-coach.ts` exports `nextFoodIdea(input)` and `type CoachInput`, plus the default handler.
  - The named exports exist so the scratch checks can call the cores without Supabase auth. None of them is an HTTP-method name, so Vercel still uses the default export.

Every code block below was type-checked with the repo's tsconfig and passed `$SCRATCH/api-checks/offline.ts` against copies. Verified copies sit at `$SCRATCH/plan-code/api/...`; `cp` them, then `diff` against this plan.

### Task A1: Drop the Anthropic SDK, add the check script, fix the baseline type check

- [ ] **Step 1: Uninstall the SDK.** Do this first, so the `node_modules` change happens before B reaches its bundle check.

```bash
cd ~/path && npm uninstall @anthropic-ai/sdk --no-audit --no-fund
```

Expected: `package.json` `dependencies` no longer lists `@anthropic-ai/sdk`, and `package-lock.json` drops `node_modules/@anthropic-ai/sdk` and its own deps. `tsx` and `esbuild` stay; they come from `@vercel/node`.

- [ ] **Step 2: Add the nutrition check script.** In `package.json` `scripts`, after `"test:store-merge"`:

```json
    "test:store-merge": "node scripts/test-store-merge.cjs",
    "test:nutrition": "node scripts/test-nutrition.cjs"
```

- [ ] **Step 3: Declare `res.send`.** In `vercel.d.ts`, inside `interface VercelResponse`, after `json(body: unknown): this;`:

```ts
    send(body: unknown): this;
```

- [ ] **Step 4: Type check.** Run `npx tsc --noEmit`. Expected: the 3 `api/udid.ts` errors are gone, and the only errors left are in `api/ai/food-photo.ts` ("Cannot find module '@anthropic-ai/sdk'"). A2 fixes those.

### Task A2: OpenRouter helper + food-photo on OpenRouter

- [ ] **Step 1: Create `api/_lib/openrouter.ts`.**

```ts
/**
 * OpenRouter call shared by the food endpoints: one chat completion with
 * strict JSON-schema output, Gemini first and an automatic fallback model.
 * Files under api/_lib are not exposed as Vercel routes.
 */
import type { VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = [
  process.env.FOOD_MODEL || "google/gemini-3.8-flash",
  process.env.FOOD_FALLBACK_MODEL || "openai/gpt-6-sol",
];

/** A failed AI call; `status` is the HTTP status the endpoint should answer with. */
export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Message = { role: "system" | "user"; content: string | Array<Record<string, unknown>> };

export async function openRouterJson<T>(opts: {
  name: string;
  schema: object;
  messages: Message[];
  maxTokens: number;
  timeoutMs: number;
}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set");
    throw new AiError(500, "Server misconfiguration");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  let response: Response;
  let body: string;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        models: MODELS,
        messages: opts.messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: opts.schema },
        },
        reasoning: { effort: "low" },
        max_tokens: opts.maxTokens,
        provider: { require_parameters: true },
      }),
      signal: controller.signal,
    });
    body = await response.text();
  } catch {
    throw new AiError(504, "AI took too long, try again");
  } finally {
    clearTimeout(timeout);
  }

  let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  try {
    data = JSON.parse(body);
  } catch {
    data = null;
  }
  if (response.status === 429) throw new AiError(429, "AI is busy, try again in a moment");
  if (!response.ok) {
    // 402 (out of credits), 5xx and anything else upstream: not the user's fault.
    console.error("OpenRouter error", response.status, data?.error?.message);
    throw new AiError(503, "AI is unavailable, try again later");
  }
  try {
    return JSON.parse(data?.choices?.[0]?.message?.content ?? "") as T;
  } catch {
    throw new AiError(502, "Couldn't read the AI response");
  }
}

/** Answer with the error's status and message. */
export function sendAiError(res: VercelResponse, err: unknown) {
  if (err instanceof AiError) return res.status(err.status).json({ error: err.message });
  console.error("Food AI failed", err);
  return res.status(500).json({ error: "Request failed" });
}
```

- [ ] **Step 2: Replace `api/ai/food-photo.ts` entirely.** The prompt is the spec's bench prompt with its rules kept. The changes are: the goal line, "photographed or described", one rule for typed meals, one rule for corrections, and "photo or description" in the no-food rule.

```ts
/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import { requireUser } from "../_lib/auth";
import { openRouterJson, sendAiError } from "../_lib/openrouter";

// App resizes to ~1024px JPEG (~150 KB base64); Vercel caps bodies at 4.5 MB.
const MAX_IMAGE_CHARS = 3_000_000;
const MAX_TEXT_CHARS = 500;
const MAX_NOTE_CHARS = 300;
// Photos, typed meals and corrections all count; caps a user's daily AI spend.
const DAILY_SCANS = 40;

type Goal = "gain" | "maintain" | "lose";
const GOAL_LINES: Record<Goal, string> = {
  gain: "The user is trying to eat more (gain weight) and eat healthier.",
  maintain: "The user is trying to maintain their weight and eat healthier.",
  lose: "The user is trying to lose weight and eat healthier.",
};

export function systemPrompt(goal?: Goal) {
  return `You are a dietitian-level nutrition analyst. The user photographed or described something they are about to eat or drink. ${goal ? GOAL_LINES[goal] : "The user is trying to eat healthier."}

Work out what it is and its nutrition, in this order of preference:
1. A nutrition facts label is visible: copy the per-serving values exactly, then multiply by the servings shown (a single-serve package = the whole package; a label on its own = 1 serving).
2. A recognizable branded or restaurant product: use its published nutrition for the size shown.
3. Otherwise identify each food, estimate grams from visual cues (dinner plate ~26 cm, fork ~19 cm, a hand, the container) and use standard food composition data. Count hidden calories: cooking oil, butter, dressing, sauce, sugar in drinks.

Rules:
- Totals cover everything shown, at the portion shown. Macros must agree with calories (4/4/9 kcal per g).
- A typed meal with no amount is one typical serving.
- Never give a real food 0 calories. Only water, black coffee, plain tea and similar are 0.
- portion: short and human, e.g. "1 bowl, ~350 g" or "1 bar (60 g)".
- items: one entry per distinct food (a packaged product is one item).
- If the user adds a note, trust it over the photo (e.g. "ate half").
- Given an earlier analysis and a note instead of a photo, re-estimate that meal with the note applied.
- health_score 1-10 judges food quality, not calories: 9-10 whole or minimally processed, protein and fiber rich, produce; 6-8 decent with some refined parts; 3-5 refined or processed, low protein or fiber; 1-2 mostly sugar, deep fried or alcohol. Calorie-dense whole foods (nuts, olive oil, avocado, salmon, whole milk) score well.
- feedback: one sentence, at most 20 words: the biggest strength or gap, plus one concrete add or swap.
- If there is no food or drink in the photo or description, set is_food to false and the numbers to 0.`;
}

const int = (description: string) => ({ type: "integer", description });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "name", "portion", "source", "items", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "health_score", "feedback"],
  properties: {
    is_food: { type: "boolean" },
    name: { type: "string", description: "Short meal or product name" },
    portion: { type: "string" },
    source: { type: "string", enum: ["label", "brand", "estimate"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "portion", "calories"],
        properties: { name: { type: "string" }, portion: { type: "string" }, calories: int("kcal") },
      },
    },
    calories: int("kcal"),
    protein: int("g"),
    carbs: int("g"),
    fat: int("g"),
    fiber: int("g"),
    sugar: int("g, total sugars"),
    sodium: int("mg"),
    health_score: int("1-10"),
    feedback: { type: "string" },
  },
};

export type FoodInput = {
  image?: string;
  text?: string;
  note?: string;
  goal?: Goal;
  previous?: { name: string; portion: string; items: Array<{ name: string; portion: string; calories: number }> };
};

/** One OpenRouter call: a photo, a typed meal, or an earlier estimate plus a correction note. */
export async function estimateFood(input: FoodInput) {
  const lines: string[] = [];
  if (input.text) lines.push(`I ate: ${input.text}`);
  if (input.previous) lines.push(`Earlier analysis: ${JSON.stringify(input.previous)}`);
  if (input.note) lines.push(`Note from me: ${input.note}`);
  const content: Array<Record<string, unknown>> = [];
  if (input.image) {
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.image}` } });
  }
  content.push({ type: "text", text: lines.join("\n") || "What is this and what's its nutrition?" });
  return openRouterJson<Record<string, unknown>>({
    name: "food",
    schema: SCHEMA,
    messages: [
      { role: "system", content: systemPrompt(input.goal) },
      { role: "user", content },
    ],
    maxTokens: 1500,
    timeoutMs: 25_000,
  });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireUser(req, res, { key: "food_photo", max: DAILY_SCANS });
  if (!userId) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const image = typeof body.image === "string" ? body.image : "";
  if (image.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: "Image too large" });
  }
  const text = str(body.text, MAX_TEXT_CHARS);
  const note = str(body.note, MAX_NOTE_CHARS);
  const goal = body.goal === "gain" || body.goal === "maintain" || body.goal === "lose" ? body.goal : undefined;
  let previous: FoodInput["previous"];
  if (body.previous && typeof body.previous === "object") {
    const p = body.previous as Record<string, unknown>;
    previous = {
      name: str(p.name, 100),
      portion: str(p.portion, 100),
      items: (Array.isArray(p.items) ? p.items : []).slice(0, 15).map((i: Record<string, unknown>) => ({
        name: str(i?.name, 100),
        portion: str(i?.portion, 100),
        calories: Math.round(Number(i?.calories)) || 0,
      })),
    };
  }
  if (!image && !text && !previous) {
    return res.status(400).json({ error: "Send a photo or a description" });
  }

  try {
    const data = await estimateFood({ image, text, note, goal, previous });
    return res.json({ ok: true, data });
  } catch (err) {
    return sendAiError(res, err);
  }
}
```

- [ ] **Step 3:** `npx tsc --noEmit`. Expected: exit 0.

### Task A3: food-coach endpoint, function limits, quota message

- [ ] **Step 1: Create `api/ai/food-coach.ts`.**

```ts
/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import { requireUser } from "../_lib/auth";
import { openRouterJson, sendAiError } from "../_lib/openrouter";

const DAILY_IDEAS = 30;
const GOALS: Record<string, string> = {
  gain: "eat more (gain weight) and eat healthier",
  maintain: "maintain their weight and eat healthier",
  lose: "lose weight and eat healthier",
};
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["idea"],
  properties: { idea: { type: "string", description: "25 words or fewer" } },
};

export type CoachInput = {
  goal?: string;
  targets: Record<string, number>;
  totals: Record<string, number>;
  meals: Array<{ name: string; calories: number; protein: number; health_score: number | null }>;
  localTime: string;
};

/** One specific next meal or snack that closes today's biggest gaps. */
export async function nextFoodIdea(input: CoachInput) {
  const meals = input.meals.length
    ? input.meals.map((m) => `- ${m.name}: ${m.calories} kcal, ${m.protein} g protein, health ${m.health_score ?? "?"}/10`).join("\n")
    : "Nothing yet.";
  const { idea } = await openRouterJson<{ idea: string }>({
    name: "idea",
    schema: SCHEMA,
    messages: [
      {
        role: "system",
        content: `You are a dietitian coaching someone who wants to ${GOALS[input.goal ?? ""] ?? GOALS.gain}. Suggest ONE specific next meal or snack in 25 words or fewer, with rough kcal and protein. Close the biggest gaps first (protein, fiber, and calories when gaining), fit the time of day, and favor whole foods. If they are already on target, suggest something light and wholesome.`,
      },
      {
        role: "user",
        content: `Local time: ${input.localTime}\nDaily targets: ${JSON.stringify(input.targets)}\nEaten so far: ${JSON.stringify(input.totals)}\nMeals today:\n${meals}`,
      },
    ],
    maxTokens: 400,
    timeoutMs: 15_000,
  });
  return idea.trim();
}

const NUMBER_KEYS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "sugarMax", "sodiumMax"];
function numbers(v: unknown) {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const k of NUMBER_KEYS) if (o[k] != null) out[k] = Math.round(Number(o[k])) || 0;
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireUser(req, res, { key: "food_coach", max: DAILY_IDEAS });
  if (!userId) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const meals = (Array.isArray(body.meals) ? body.meals : []).slice(0, 30).map((m: Record<string, unknown>) => ({
    name: typeof m?.name === "string" ? m.name.slice(0, 80) : "Meal",
    calories: Math.round(Number(m?.calories)) || 0,
    protein: Math.round(Number(m?.protein)) || 0,
    health_score: Number.isFinite(Number(m?.health_score)) && m?.health_score != null ? Number(m.health_score) : null,
  }));

  try {
    const idea = await nextFoodIdea({
      goal: typeof body.goal === "string" ? body.goal : undefined,
      targets: numbers(body.targets),
      totals: numbers(body.totals),
      meals,
      localTime: typeof body.localTime === "string" ? body.localTime.slice(0, 5) : "",
    });
    return res.json({ ok: true, idea });
  } catch (err) {
    return sendAiError(res, err);
  }
}
```

- [ ] **Step 2: Pin the function limits** above the upstream timeouts, so a slow fallback still answers with JSON instead of a platform timeout page. Add to `vercel.json` (keep the other keys):

```json
  "functions": {
    "api/ai/food-photo.ts": { "maxDuration": 30 },
    "api/ai/food-coach.ts": { "maxDuration": 20 }
  },
```

- [ ] **Step 3: Generic quota message.** Typed meals now count toward `food_photo` too, so "Type it in instead" is wrong. `food_coach` shares this code path. In `api/_lib/auth.ts`, replace the 429 message string with:

```ts
        error: `That's all ${daily.max} AI requests for today. Try again tomorrow.`,
```

- [ ] **Step 4:** `npx tsc --noEmit`. Expected: exit 0.

### Task A4: Verify

- [ ] **Step 1: Offline mapping check.** fetch is faked, so this costs nothing. It asserts the request body (`models` array and no `model`, low reasoning, `require_parameters`, strict schema) and the status mapping (429, 402→503, 5xx→503, unreadable→502, timeout→504). It also asserts the photo, text and correction message shapes and the coach idea trimming.

```bash
cd ~/path && npx tsx "$SCRATCH/api-checks/offline.ts"
```

Expected: last line `openrouter mapping checks passed`. The two `OpenRouter error ...` lines and the tsx deprecation warning are expected noise.

- [ ] **Step 2: Live check.** About $0.01. It sends the bench Big Mac photo, the bench label photo, a typed meal, a "half" correction and one coach idea, asserts sane values, and prints the spend.

```bash
( export OPENROUTER_API_KEY="$(sed -n 's/^OPENROUTER_API_KEY=//p' "$HOME/Library/Application Support/Jarvis/jarvis.env")"; cd ~/path && npx tsx "$SCRATCH/api-checks/live.ts" )
```

Expected: one line per call with its latency (about 3–6 s per photo) and `live food AI checks passed`, with `spent $` under 0.03.
- If OpenRouter rejects a body that has `models` but no `model`, add `model: MODELS[0]` beside `models` in the helper, then update the matching assertion in `offline.ts`.
- If an accuracy assertion is borderline, rerun once. Do not loosen the prompt rules.
- Report the latencies and the spend.

- [ ] **Step 3: No Anthropic left.**

```bash
cd ~/path && grep -rniE "anthropic" --exclude-dir=node_modules --exclude-dir=.git . | grep -v "^./docs/superpowers"
```

Expected for A's files: no output. `src/` comments that mention Claude belong to B (`ai.js`) and D (`FoodScan.js`).

---

## Unit B-data

**Files:**
- Create: `scripts/test-nutrition.cjs`, `src/utils/nutrition.js` and `supabase/migrations/008_food_nutrition.sql`.
- Rewrite: `src/utils/goalSuggest.js`, as CommonJS.
- Modify: `src/api/supabaseSync.js`, `src/store/useStore.js`, `src/api/ai.js` and `src/api/config.js`.

**Interfaces:**
- Consumes: K10 and K11 HTTP (A implements them in parallel; you only call them).
- Produces: K1–K5 and the `test:nutrition` file.

Verified copies of the new files are at `$SCRATCH/plan-code/`. The node check below passes against them.

### Task B1: Write the failing node check

- [ ] **Step 1: Create `scripts/test-nutrition.cjs`.**

```js
const assert = require('node:assert/strict');
const { suggestGoals } = require('../src/utils/goalSuggest');
const { foodFields, dayTotals, dailyTargets, dayGrade, gapLine } = require('../src/utils/nutrition');

// Targets. The app stores weight in pounds: 154 lb = 69.8 kg, 5'10" = 177.8 cm.
const me = { weight: '154', height: `5'10"`, age: '25', sex: 'male', activity: 'moderate', goalType: 'gain' };
assert.deepEqual(suggestGoals(me), {
  calories: 3019, protein: 126, carbs: 402, fat: 101, fiber: 42, sugarMax: 75, sodiumMax: 2300,
});
assert.equal(suggestGoals({ ...me, height: '70' }).calories, 3019, 'bare height "70" is inches');
assert.equal(suggestGoals({ ...me, height: '178' }).calories, 3021, 'bare height "178" is cm');
assert.equal(suggestGoals({ ...me, goalType: 'lose' }).calories, 3019 - 900, 'lose = maintenance - 500, gain = +400');
assert.equal(suggestGoals({ ...me, goalType: 'lose' }).protein, 140, 'lose = 2.0 g/kg protein');
assert.equal(suggestGoals({ ...me, goalType: 'maintain' }).protein, 112, 'maintain = 1.6 g/kg protein');
assert.ok(suggestGoals({ ...me, weight: '' }).error);
assert.deepEqual(dailyTargets({}), {
  calories: 2000, protein: 120, carbs: 229, fat: 67, fiber: 28, sugarMax: 50, sodiumMax: 2300,
});
const saved = dailyTargets({ ...me, calorieGoal: '3200', fiberGoal: '40' });
assert.equal(saved.calories, 3200, 'a saved goal overrides the suggestion');
assert.equal(saved.fiber, 40);
assert.equal(saved.protein, 126, 'unsaved goals still come from the suggestion');
assert.equal(saved.fat, 107, 'fat is 30% of the saved calories');

// Event fields from an API result.
const bigMac = foodFields({
  is_food: true, name: " McDonald's Big Mac ", portion: '1 burger (219 g)', source: 'brand',
  items: [{ name: 'Big Mac', portion: '1 burger', calories: 590 }],
  calories: 590, protein: 25, carbs: 46, fat: 34, fiber: 3, sugar: 9, sodium: 1050, health_score: 4,
  feedback: 'Add a side salad for fiber.',
});
assert.deepEqual(bigMac, {
  description: "McDonald's Big Mac", note: '1 burger (219 g)', calories: 590, protein: 25, carbs: 46, fat: 34,
  nutrition: {
    fiber: 3, sugar: 9, sodium: 1050, health_score: 4, feedback: 'Add a side salad for fiber.',
    items: [{ name: 'Big Mac', portion: '1 burger', calories: 590 }], source: 'brand',
  },
});
const old = foodFields({ name: 'Toast', portion: '', calories: -5, protein: '7.6', health_score: 14 });
assert.equal(old.note, undefined);
assert.equal(old.calories, 0, 'negative numbers become 0');
assert.equal(old.protein, 8);
assert.equal(old.nutrition.health_score, 10, 'health score is clamped to 1-10');
assert.equal(foodFields({ name: 'x' }).nutrition.health_score, null);
assert.deepEqual(dayTotals([bigMac, { calories: 100, protein: 5 }]), {
  calories: 690, protein: 30, carbs: 46, fat: 34, fiber: 3, sugar: 9, sodium: 1050,
});

// Day grade.
const targets = dailyTargets(me);
const meal = (calories, protein, fiber, sugar, health_score) => ({ calories, protein, nutrition: { fiber, sugar, health_score } });
const junk = [
  meal(390, 11, 0, 50, 3), meal(390, 11, 0, 50, 3), meal(390, 11, 0, 50, 3), // pumpkin spice lattes
  ...Array(5).fill(meal(340, 5, 0, 41, 2)), // ice cream
];
assert.ok(Math.abs(dayTotals(junk).calories - targets.calories) < 200, 'junk day sits at the calorie goal');
assert.match(dayGrade(junk, targets, { goal: 'gain', hour: 21 }).letter, /^[DF]$/, 'coffee and ice cream at goal grades D or F');
const balanced = [
  meal(650, 35, 10, 12, 9), meal(850, 40, 12, 10, 8), meal(400, 20, 6, 15, 7), meal(1100, 35, 15, 20, 8),
];
assert.equal(dayGrade(balanced, targets, { goal: 'gain', hour: 21 }).letter, 'A', 'a balanced day grades A');
assert.equal(dayGrade(balanced.slice(0, 2), targets, { goal: 'gain', hour: 13 }).letter, 'A', 'lunchtime is paced, not an F');
assert.equal(dayGrade([], targets, { hour: 12 }), null);
assert.equal(dayGrade([{ calories: 600, protein: 40 }], targets, { hour: 12 }).letter.length, 1, 'meals without a health score still grade');
assert.equal(dayGrade(junk, targets, { goal: 'gain', hour: 21 }).reason, 'Mostly processed or sugary food so far');

// What-to-eat-next gap line.
assert.equal(
  gapLine({ calories: 1900, protein: 80, fiber: 24 }, { calories: 2800, protein: 140, fiber: 39 }),
  '~60 g protein · 15 g fiber · 900 kcal to go',
);
assert.equal(gapLine({ calories: 3000, protein: 150, fiber: 40 }, { calories: 2800, protein: 140, fiber: 39 }), null);

console.log('LifeSync nutrition tests passed');
```

- [ ] **Step 2: Run it.** `cd ~/path && node scripts/test-nutrition.cjs`. Expected: FAIL with `Cannot find module '../src/utils/nutrition'`, or a syntax error from the ESM `export` in `goalSuggest.js`.

### Task B2: Targets and day math

- [ ] **Step 1: Replace `src/utils/goalSuggest.js` entirely** with CommonJS. This also fixes two real bugs:
  - The old code read a bare weight such as `"154"` as kg, but the app stores pounds.
  - The old feet/inches regex matched bare numbers, so `"178"` became 17 ft 8 in.

```js
'use strict';

/**
 * Suggest daily nutrition targets from the profile: Mifflin-St Jeor BMR times
 * an activity factor, adjusted for the goal (gain / maintain / lose).
 * CommonJS so scripts/test-nutrition.cjs can load it in plain node.
 */

const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
// kcal on top of maintenance, and protein grams per kg of body weight.
const GOAL_PLANS = {
  gain: { kcal: 400, proteinPerKg: 1.8 },
  maintain: { kcal: 0, proteinPerKg: 1.6 },
  lose: { kcal: -500, proteinPerKg: 2.0 },
};
const SODIUM_MAX_MG = 2300;

function parseNumber(str) {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).replace(/,/g, '').trim();
  const match = s.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Parse weight to kg. The app stores pounds ("154"); "70 kg" also works. */
function weightToKg(weightStr) {
  const n = parseNumber(weightStr);
  if (n == null) return null;
  return String(weightStr).toLowerCase().includes('kg') ? n : n / 2.205;
}

/** Parse height to cm. Supports 5'10", "178 cm", "70" (inches) and "5.9" (feet). */
function heightToCm(heightStr) {
  if (heightStr == null || String(heightStr).trim() === '') return null;
  const s = String(heightStr).trim().toLowerCase();
  const ftInMatch = s.match(/^(\d+)\s*'\s*(\d+)\s*["']*\s*$/);
  if (ftInMatch) {
    return (parseInt(ftInMatch[1], 10) * 12 + parseInt(ftInMatch[2], 10)) * 2.54;
  }
  const n = parseNumber(heightStr);
  if (n == null) return null;
  if (s.includes('in')) return n * 2.54;
  if (s.includes('cm') || s.includes('m')) return n;
  if (n < 10) return n * 30.48;
  if (n < 100) return n * 2.54;
  return n;
}

/** Mifflin-St Jeor BMR in kcal/day. Unset sex uses the male constant. */
function mifflinStJeor(weightKg, heightCm, age, sex) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
}

/** Carbs, fat, fiber and sugar cap that go with a calorie and protein target. */
function macroSplit(calories, protein) {
  const fat = Math.round((calories * 0.3) / 9);
  return {
    carbs: Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4)),
    fat,
    fiber: clamp(Math.round((calories / 1000) * 14), 25, 45),
    sugarMax: Math.round((calories * 0.1) / 4),
  };
}

/**
 * @param {{ age?: string, height?: string, weight?: string, sex?: string, activity?: string, goalType?: string }} profile
 * @returns {{ calories: number, protein: number, carbs: number, fat: number, fiber: number, sugarMax: number, sodiumMax: number } | { error: string }}
 */
function suggestGoals(profile) {
  const age = parseNumber(profile.age);
  const heightCm = heightToCm(profile.height);
  const weightKg = weightToKg(profile.weight);

  if (weightKg == null || weightKg <= 0) {
    return { error: 'Enter your weight to get suggestions.' };
  }
  if (heightCm == null || heightCm <= 0) {
    return { error: 'Enter your height to get suggestions.' };
  }
  if (age == null || age < 10 || age > 120) {
    return { error: 'Enter your age to get suggestions.' };
  }

  const plan = GOAL_PLANS[profile.goalType] || GOAL_PLANS.gain;
  const factor = ACTIVITY_FACTORS[profile.activity] || ACTIVITY_FACTORS.moderate;
  const maintenance = mifflinStJeor(weightKg, heightCm, age, profile.sex) * factor;
  const calories = clamp(Math.round(maintenance + plan.kcal), 1200, 4500);
  const protein = clamp(Math.round(weightKg * plan.proteinPerKg), 50, 300);
  return { calories, protein, ...macroSplit(calories, protein), sodiumMax: SODIUM_MAX_MG };
}

module.exports = { suggestGoals, macroSplit, SODIUM_MAX_MG };
```

- [ ] **Step 2: Create `src/utils/nutrition.js`.**

```js
'use strict';

/**
 * Pure food math shared by the queue, meal detail and Today card. CommonJS so
 * scripts/test-nutrition.cjs can load it in plain node.
 */
const { suggestGoals, macroSplit, SODIUM_MAX_MG } = require('./goalSuggest');

const DEFAULT_CALORIES = 2000;
const DEFAULT_PROTEIN = 120;
const SOURCES = ['label', 'brand', 'estimate'];
const GRADE_WEIGHTS = { quality: 0.3, protein: 0.25, calories: 0.2, fiber: 0.15, sugar: 0.1 };
const GRADE_REASONS = {
  quality: 'Mostly processed or sugary food so far',
  protein: 'Protein is behind',
  under: 'Calories are behind',
  over: 'Over your calorie target',
  fiber: 'Low on fiber: add fruit, veg, beans or whole grains',
  sugar: 'Sugar is over your cap',
};

function int(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Food event fields from a food-photo API result (name -> description, portion -> note). */
function foodFields(d) {
  const score = Math.round(Number(d?.health_score));
  return {
    description: typeof d?.name === 'string' ? d.name.trim() : '',
    note: typeof d?.portion === 'string' && d.portion.trim() ? d.portion.trim() : undefined,
    calories: int(d?.calories),
    protein: int(d?.protein),
    carbs: int(d?.carbs),
    fat: int(d?.fat),
    nutrition: {
      fiber: int(d?.fiber),
      sugar: int(d?.sugar),
      sodium: int(d?.sodium),
      health_score: Number.isFinite(score) ? Math.min(10, Math.max(1, score)) : null,
      feedback: typeof d?.feedback === 'string' ? d.feedback.trim() : '',
      items: Array.isArray(d?.items)
        ? d.items.map((i) => ({ name: String(i?.name ?? ''), portion: String(i?.portion ?? ''), calories: int(i?.calories) }))
        : [],
      source: SOURCES.includes(d?.source) ? d.source : 'estimate',
    },
  };
}

/** Summed kcal, protein/carbs/fat/fiber/sugar (g) and sodium (mg) of food events. */
function dayTotals(meals) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const m of meals) {
    for (const k of ['calories', 'protein', 'carbs', 'fat']) t[k] += Number(m[k]) || 0;
    for (const k of ['fiber', 'sugar', 'sodium']) t[k] += Number(m.nutrition?.[k]) || 0;
  }
  return t;
}

/** Today's targets: goals saved on the profile win; the rest come from suggestGoals, else 2000 kcal defaults. */
function dailyTargets(profile = {}) {
  const suggested = suggestGoals(profile);
  const saved = (key) => parseInt(profile[key], 10) || 0;
  const calories = saved('calorieGoal') || suggested.calories || DEFAULT_CALORIES;
  const protein = saved('proteinGoal') || suggested.protein || DEFAULT_PROTEIN;
  const split = macroSplit(calories, protein);
  return {
    calories,
    protein,
    carbs: saved('carbGoal') || split.carbs,
    fat: saved('fatGoal') || split.fat,
    fiber: saved('fiberGoal') || split.fiber,
    sugarMax: split.sugarMax,
    sodiumMax: SODIUM_MAX_MG,
  };
}

/**
 * A-F grade for the day so far, or null with no meals. Targets are paced by the
 * local hour so a lunchtime grade doesn't count dinner as missing.
 * @returns {{ letter: string, score: number, reason: string } | null}
 */
function dayGrade(meals, targets, { goal = 'gain', hour = 24 } = {}) {
  if (!meals.length) return null;
  const t = dayTotals(meals);
  const pace = Math.min(1, Math.max(0.25, (hour - 7) / 13));
  const upTo = (value, target) => (target > 0 ? Math.min(1, value / (target * pace)) * 100 : 100);

  let scoreKcal = 0;
  let kcal = 0;
  for (const m of meals) {
    const s = m.nutrition?.health_score;
    const c = Number(m.calories) || 0;
    if (s && c > 0) {
      scoreKcal += s * c;
      kcal += c;
    }
  }
  const ratio = targets.calories > 0 ? t.calories / (targets.calories * pace) : 1;
  const under = Math.min(1, ratio) * 100;
  const over = ratio <= 1 ? 100 : Math.max(0, (1.5 - ratio) / 0.5) * 100;
  const parts = {
    quality: kcal > 0 ? (scoreKcal / kcal) * 10 : null,
    protein: upTo(t.protein, targets.protein),
    calories: goal === 'lose' ? over : goal === 'maintain' ? Math.min(under, over) : under,
    fiber: upTo(t.fiber, targets.fiber),
    sugar: t.sugar <= targets.sugarMax ? 100 : Math.max(0, 2 - t.sugar / targets.sugarMax) * 100,
  };

  let sum = 0;
  let weight = 0;
  let worst = null;
  for (const [key, value] of Object.entries(parts)) {
    if (value == null) continue;
    sum += GRADE_WEIGHTS[key] * value;
    weight += GRADE_WEIGHTS[key];
    const loss = GRADE_WEIGHTS[key] * (100 - value);
    if (loss > 0 && (!worst || loss > worst.loss)) worst = { key, loss };
  }
  const score = Math.round(sum / weight);
  const letter = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  let reason = 'On track, nice balance';
  if (score < 85 && worst) {
    reason = worst.key === 'calories' ? GRADE_REASONS[under < over ? 'under' : 'over'] : GRADE_REASONS[worst.key];
  }
  return { letter, score, reason };
}

/** "~60 g protein · 15 g fiber · 900 kcal to go", or null once those are met. */
function gapLine(totals, targets) {
  const protein = targets.protein - totals.protein;
  const fiber = targets.fiber - totals.fiber;
  const kcal = targets.calories - totals.calories;
  const parts = [];
  if (protein >= 5) parts.push(`${Math.round(protein / 5) * 5} g protein`);
  if (fiber >= 3) parts.push(`${Math.round(fiber)} g fiber`);
  if (kcal >= 100) parts.push(`${Math.round(kcal / 50) * 50} kcal`);
  return parts.length ? `~${parts.join(' · ')} to go` : null;
}

/** Palette key for a 1-10 health score: green 7+, orange 4-6, red 1-3, null without a score. */
function healthTone(score) {
  if (!score) return null;
  return score >= 7 ? 'green' : score >= 4 ? 'orange' : 'red';
}

module.exports = { foodFields, dayTotals, dailyTargets, dayGrade, gapLine, healthTone };
```

- [ ] **Step 3: Run the check.** `node scripts/test-nutrition.cjs`. Expected: `LifeSync nutrition tests passed`.
  - The junk day (3 pumpkin spice lattes and 5 ice creams at the calorie goal) grades F (score 38).
  - The balanced day grades A (94).
  - A lunchtime half day grades A (95).
  - Do not edit the expected numbers to make a failing implementation pass.

### Task B3: Migration (write only; never apply)

- [ ] **Step 1: Create `supabase/migrations/008_food_nutrition.sql`.**

```sql
-- Food logging v2: full nutrition per meal and goal settings on the profile.
-- Apply BEFORE any app build that syncs these fields: PostgREST rejects unknown
-- columns, so every event and profile save from a new build fails until then.

-- { fiber, sugar, sodium, health_score, feedback, items, source }. Calories,
-- protein, carbs and fat keep their columns (the portion stays in note) so
-- older builds keep reading them.
alter table public.events add column if not exists nutrition jsonb;

alter table public.profile add column if not exists goal_type text; -- gain | maintain | lose
alter table public.profile add column if not exists sex text; -- male | female
alter table public.profile add column if not exists activity text; -- sedentary | light | moderate | active
alter table public.profile add column if not exists carb_goal int;
alter table public.profile add column if not exists fat_goal int;
alter table public.profile add column if not exists fiber_goal int;
```

### Task B4: Sync mapping (`src/api/supabaseSync.js`)

- [ ] **Step 1: Events.** In `eventToRow`, after `fat: e.fat ?? null,` add `nutrition: e.nutrition ?? null,`. In `rowToEvent`, after the `fat` line add `if (row.nutrition) e.nutrition = row.nutrition;`.
- [ ] **Step 2: Profile load.** In `loadFromSupabase`, add these to the `profile = { ... }` object after `waterGoalOz`:

```js
        goalType: p.goal_type || 'gain',
        sex: p.sex ?? '',
        activity: p.activity ?? '',
        carbGoal: p.carb_goal != null ? String(p.carb_goal) : '',
        fatGoal: p.fat_goal != null ? String(p.fat_goal) : '',
        fiberGoal: p.fiber_goal != null ? String(p.fiber_goal) : '',
```

- [ ] **Step 3: Profile save.** In `saveProfileToSupabase`:
  - Add a module-level helper next to `ensureSignedIn`:
    ```js
    const intOrNull = (v) => (v != null && v !== '' ? parseInt(v, 10) : null);
    ```
  - Use it for `calorie_goal`, `protein_goal` and `water_goal_oz` too. The behaviour is identical.
  - Add to `row`:

```js
    goal_type: profile.goalType || null,
    sex: profile.sex || null,
    activity: profile.activity || null,
    carb_goal: intOrNull(profile.carbGoal),
    fat_goal: intOrNull(profile.fatGoal),
    fiber_goal: intOrNull(profile.fiberGoal),
```

### Task B5: Store (`src/store/useStore.js`)

- [ ] **Step 1:** Below `const { mergeHydratedEvents } = require('./eventMerge');` add `const { dayTotals } = require('../utils/nutrition');`.
- [ ] **Step 2:** In `initialState.profile`, after `waterGoalOz: '',` add `goalType: 'gain', sex: '', activity: '', carbGoal: '', fatGoal: '', fiberGoal: '',`.
- [ ] **Step 3:** Replace `useTodayCaloriesAndProtein` (the last function in the file) with:

```js
/** Today's food events (unsorted) and their summed nutrition. */
export function useTodayFood() {
  const { state } = useStore();
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const meals = state.events.filter((e) => e.type === EVENT_TYPES.food && e.date === date);
  return { date, meals, totals: dayTotals(meals) };
}
```

### Task B6: AI client (`src/api/config.js`, `src/api/ai.js`)

- [ ] **Step 1:** In `config.js` `AI`, add ``foodCoach: `${API_BASE_URL}/api/ai/food-coach`,`` after `foodPhoto`.
- [ ] **Step 2:** In `ai.js`, under the three imports add `const { foodFields } = require("../utils/nutrition");`.
- [ ] **Step 3: Delete from `ai.js`:**
  - `extractFood` with its JSDoc
  - `PHOTO_TIMEOUT_MS`
  - `analyzeFoodPhoto` with its JSDoc (it mentions Claude)
  - `normalizeFoodData`

  Keep `EXTRACT_TIMEOUT_MS`, `PHOTO_MAX_WIDTH`, `prepareFoodPhoto`, `num` (still used by `normalizeExerciseData`) and everything from `extractExercise` down.
- [ ] **Step 4:** Insert the new block right after `prepareFoodPhoto`. This is the verified copy `$SCRATCH/plan-code/src/api/ai-food-block.js`, and it passes an esbuild syntax check.

```js
const FOOD_TIMEOUT_MS = 30000;
const IDEA_TIMEOUT_MS = 20000;

/**
 * Estimate a meal with the food AI: a photo, a typed meal, or a correction of
 * an earlier estimate ({ previous, note }). Resolves to food event fields.
 *
 * @param {{ image?: string, text?: string, note?: string, goal?: 'gain'|'maintain'|'lose', previous?: { name: string, portion: string, items: Array<{ name: string, portion: string, calories: number }> } }} input
 * @returns {Promise<{ ok: true, data: { description: string, note?: string, calories: number, protein: number, carbs: number, fat: number, nutrition: object } } | { ok: false, error: string, offline?: boolean }>}
 *   offline: the request never got an answer (no connection / timeout) — safe to retry later.
 */
export async function analyzeFood(input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FOOD_TIMEOUT_MS);
  try {
    const res = await fetch(AI.foodPhoto, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: typeof json?.error === "string" ? json.error : res.statusText || "Request failed" };
    }
    if (!json?.data || json.data.is_food === false) {
      return { ok: false, error: "Couldn't find any food there. Try a closer photo or describe it." };
    }
    return { ok: true, data: foodFields(json.data) };
  } catch (err) {
    return {
      ok: false,
      offline: true,
      error: err?.name === "AbortError" ? "Took too long. Check your connection." : err?.message || "Network error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One short "what to eat next" idea for today from the food coach.
 * @param {{ goal: string, targets: object, totals: object, meals: Array<{ name: string, calories: number, protein: number, health_score: number|null }>, localTime: string }} payload
 * @returns {Promise<{ ok: boolean, idea?: string, error?: string }>}
 */
export async function getFoodIdea(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IDEA_TIMEOUT_MS);
  try {
    const res = await fetch(AI.foodCoach, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    return { ok: true, idea: typeof json?.idea === "string" ? json.idea : "" };
  } catch (err) {
    return { ok: false, error: err?.message || "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}
```

### Task B7: Verify

- [ ] `node scripts/test-nutrition.cjs` prints `LifeSync nutrition tests passed`.
- [ ] `npm run test:store-merge` prints `LifeSync store merge tests passed`.
- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-B"` exits 0.
- [ ] `grep -nE "export (function|const)" src/utils/goalSuggest.js src/utils/nutrition.js` prints nothing (CommonJS only).
- [ ] `grep -niE "claude|anthropic" src/api/ai.js` prints nothing.

---

## Unit C-queue (starts after B)

**Files:**
- Rewrite: `src/store/pendingFood.js`.
- Modify: `src/components/Home/FoodLog.js`.
- `src/utils/pickFoodPhoto.js`: **no change** (keep `pickFoodPhoto(source: 'camera'|'library') → Promise<string|null>`).

**Interfaces:**
- Consumes:
  - `analyzeFood` and `prepareFoodPhoto` (K5)
  - `healthTone` (K4)
  - `useStore()`, `useEvents` and `useTodayFood()` (K3)
  - `EVENT_TYPES`
- Produces: K6 and the K7 navigations from Home. `FoodCapture` and `TodayMeals` keep their names (K8).

### Task C1: The queue

- [ ] **Step 1: Replace `src/store/pendingFood.js` entirely.** This copy passed `$SCRATCH/queue-harness/harness.mjs`.

```js
/**
 * Snap-and-go food queue. Every snapped or typed meal lands here and is
 * estimated in the background (up to 3 at once), then added as a normal food
 * event with its original date/time. Offline items wait and retry.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { analyzeFood } from '../api/ai';
import { EVENT_TYPES } from './mockData';

const STORAGE_KEY = '@lifesync_pending_food';
const RETRY_MS = 60000;
const MAX_PARALLEL = 3;

// { id, image?, text?, date, time, goal?, status: 'analyzing' | 'waiting' | 'error', error? }
let items = [];
const listeners = new Set();
const inFlight = new Set();
let dispatchRef = null;

function setItems(next) {
  items = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
}

function patch(id, changes) {
  setItems(items.map((i) => (i.id === id ? { ...i, ...changes } : i)));
}

export function usePendingFood() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items
  );
}

/**
 * Add a meal and start estimating it right away (light haptic; callers don't add their own).
 * @param {{ image?: string, text?: string, date: string, time: string, goal?: 'gain'|'maintain'|'lose' }} entry
 */
export function queueFood(entry) {
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  setItems([...items, { id, ...entry, status: 'analyzing' }]);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  run();
}

export function retryPending(id) {
  patch(id, { status: 'analyzing', error: undefined });
  run();
}

export function removePending(id) {
  setItems(items.filter((i) => i.id !== id));
}

/** Drop the whole queue on sign-out so one account's meals never land in another. */
export function clearPendingFood() {
  setItems([]);
}

async function analyze(item) {
  inFlight.add(item.id);
  try {
    const res = await analyzeFood({ image: item.image, text: item.text, goal: item.goal });
    if (!items.some((i) => i.id === item.id)) return; // removed while analyzing
    if (res.offline || !dispatchRef) return patch(item.id, { status: 'waiting' });
    if (!res.ok) return patch(item.id, { status: 'error', error: res.error || 'Could not estimate' });
    dispatchRef({
      type: 'ADD_EVENT',
      payload: {
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
        type: EVENT_TYPES.food,
        date: item.date,
        time: item.time,
        ...res.data,
        description: res.data.description || item.text || 'Meal',
      },
    });
    removePending(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    patch(item.id, { status: 'error', error: 'Could not estimate' });
  } finally {
    inFlight.delete(item.id);
    run();
  }
}

/** Start every ready item, up to MAX_PARALLEL requests at once. */
function run() {
  if (!dispatchRef) return;
  for (const item of items) {
    if (inFlight.size >= MAX_PARALLEL) return;
    if (item.status === 'analyzing' && !inFlight.has(item.id)) analyze(item);
  }
}

/** Waiting (offline) items get another try. */
function retryWaiting() {
  if (items.some((i) => i.status === 'waiting')) {
    setItems(items.map((i) => (i.status === 'waiting' ? { ...i, status: 'analyzing' } : i)));
  }
  run();
}

/** Load the saved queue and keep draining it whenever we're (back) online. Returns cleanup. */
export function startPendingFoodSync(dispatch) {
  dispatchRef = dispatch;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved = raw ? JSON.parse(raw) : [];
      const known = new Set(items.map((i) => i.id));
      // Older builds saved items without a status: an error stays an error, the rest run again.
      const restored = (Array.isArray(saved) ? saved : [])
        .filter((i) => !known.has(i.id))
        .map((i) => ({ ...i, status: i.status === 'error' || i.error ? 'error' : 'analyzing' }));
      if (restored.length) setItems([...restored, ...items]);
      run();
    })
    .catch(() => {});
  const net = Network.addNetworkStateListener((s) => {
    if ((s.isInternetReachable ?? s.isConnected) !== false) retryWaiting();
  });
  const app = AppState.addEventListener('change', (s) => s === 'active' && retryWaiting());
  // ponytail: fixed 60s retry while items wait; backoff if this ever matters for battery.
  const timer = setInterval(retryWaiting, RETRY_MS);
  return () => {
    dispatchRef = null;
    net.remove();
    app.remove();
    clearInterval(timer);
  };
}
```

- [ ] **Step 2: Run the harness against the real file.** It bundles the file with esbuild, stubs React Native, AsyncStorage, expo-network, expo-haptics and `../api/ai`, then checks the behaviour step by step.

```bash
node "$SCRATCH/queue-harness/harness.mjs" ~/path "$SCRATCH/queue-harness/out/C.mjs"
```

Expected: `pendingFood harness passed`. It covers:
- max 3 in flight
- `ADD_EVENT` keeps the original date and carries `nutrition`
- offline → `waiting` with no loop
- error → `error` with the message
- removal mid-flight never adds the meal
- retry and foreground retry
- the text fallback for an empty name
- no dispatch after unmount
- old-format items restored
- the light haptic per queue and the success haptic

### Task C2: Snap and go (`FoodCapture`)

- [ ] Camera and library buttons: `const uri = await pickFoodPhoto(source); if (!uri) return;`, then `const image = await prepareFoodPhoto(uri)` and `queueFood({ image, date: todayKey(), time: getTimeNow24h(), goal: state.profile.goalType })`.
  - **No navigation.** The user stays on Home.
  - No haptic here; `queueFood` fires it.
  - If `prepareFoodPhoto` throws, show `Alert.alert('Could not read that photo', 'Try another one.')`.
- [ ] The "describe" (create) button keeps `navigation.navigate('FoodEvent')`. D's add mode queues the text.
- [ ] Keep the glow, the streak line, the layout and the accessibility labels.

### Task C3: `TodayMeals` rows

- [ ] Remove the macro totals header row; the Today card shows the macros now.
- [ ] Order: all pending items first (insertion order, any date), then today's meals newest first. Use `useTodayFood().meals` sorted by `time` descending.
- [ ] Empty state, with no meals and nothing pending: `No meals yet today. Snap your first one.` (unchanged).
- [ ] **Pending row** (not pressable):
  - Left side: a 40×40 thumbnail from `data:image/jpeg;base64,${image}` (the existing `styles.thumb`), or `Ionicons "create-outline"` for a typed item.
  - Title: `item.text || 'Photo meal'`.
  - Status line by `status`:
    - `analyzing`: `Analyzing…` in `text.footnote` with a Reanimated opacity pulse, `withRepeat(withTiming(..., 900 ms), -1, true)` between about 0.35 and 1 (the same pattern as the FoodCapture glow).
    - `waiting`: `Waiting for internet` in `palette.secondaryLabel`.
    - `error`: `item.error` in `palette.red` (2 lines max), plus a **Retry** icon button (`refresh-circle`, `palette.tint`, `accessibilityLabel="Retry"`) → `retryPending(id)`.
  - Every pending row has a **Remove** button (`close-circle`, `palette.tertiaryLabel`, `accessibilityLabel="Remove"`) → `removePending(id)`.
  - Use a fade or layout transition when the row leaves.
- [ ] **Meal row** (pressable → `navigation.navigate('FoodEvent', { eventId: meal.id })`):
  - Left: name (1 line), then `formatTime12h(time)` plus ` · ${note}` when there is a portion.
  - Right: kcal (`text.headline`) over `${protein}p · ${carbs}c · ${fat}f` (`text.caption`), and the K12 health chip when `nutrition?.health_score` is set.
  - Accessibility label: `${description}, ${calories} calories`.
  - Keep the `FadeInDown`/`LinearTransition` entering and layout animations, so a pending row visibly becomes a meal.

### Task C4: Verify

- [ ] Harness passes (C1 Step 2).
- [ ] `npm run test:nutrition` passes (or `node scripts/test-nutrition.cjs` if A's script line isn't in yet).
- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-C"` exits 0.
- [ ] `grep -nE "extractFood|analyzeFoodPhoto|isOnline|photoUri|CalendarTab" src/store/pendingFood.js src/components/Home/FoodLog.js` prints nothing.

---

## Unit D-detail (starts after B)

**Files:**
- Rewrite: `src/screens/EventScreens/FoodEventScreen.js`.
- Modify: `src/components/Food/FoodScan.js`, `src/components/Calendar/EventEditSheet.js` and `src/navigation/CalendarStack.js`.
- No change expected: `src/navigation/HomeStack.js` and `src/navigation/AddEventStack.js` (they already register `FoodEvent`), and `src/components/Calendar/EventCard.js` (its food line, the description or else the calories, stays correct).

**Interfaces:**
- Consumes:
  - `analyzeFood` and `prepareFoodPhoto` (K5)
  - `queueFood` (K6; do **not** import `isOnline`, which is gone, and do not fire your own haptic when queueing)
  - `healthTone` (K4)
  - `useStore` and `useEvents` (K3)
  - `deleteEventFromSupabase` and `isSupabaseConfigured`
- Produces: K7 (screen behaviour and the Calendar registration) and K8 (FoodScan exports).

### Task D1: `FoodEventScreen` add mode (no params)

- [ ] Header: back chevron and the title `log food.` (as today).
- [ ] Two tiles, **Take photo** and **Upload** (the existing `pickRow`/`pickTile`): `pickFoodPhoto(source)` → `prepareFoodPhoto(uri)` → `queueFood({ image, date: formatDateKey(new Date()), time: getTimeNow24h(), goal: state.profile.goalType })` → leave.
- [ ] "Or describe it" input plus a **Log it** button, disabled while the input is empty. Submitting, by the button or the return key, runs `queueFood({ text: text.trim(), date, time, goal })` → leave.
- [ ] Leaving lands on Home in both stacks (React Navigation 7's `navigate` pushes rather than going back, so don't navigate to `Home`):
  ```js
  navigation.popToTop();
  navigation.getParent()?.navigate('HomeTab');
  ```
- [ ] States:
  - idle
  - `preparing`: a disabled tile with an ActivityIndicator, shown while `prepareFoodPhoto` runs
  - `error`: a red footnote `Could not read that photo`
- [ ] There is no scanning animation, no result step and no confirm step in add mode.

### Task D2: `FoodEventScreen` detail mode (`route.params.eventId`)

- [ ] Find the event with `useEvents().find((e) => e.id === eventId)`. If it is missing (deleted elsewhere), call `navigation.goBack()` in an effect and render nothing.
- [ ] Initialize a draft once per `eventId`:
  - `name` from `description`
  - `portion` from `note`
  - `fields` holds strings for all 7 numbers: `calories`, `protein`, `carbs` and `fat` from the event; `fiber`, `sugar` and `sodium` from `nutrition` (`''` when `nutrition` is missing)
  - `nutrition` is `event.nutrition`, possibly undefined
  - `servings` starts at 1
- [ ] Title `your meal.`. Show:
  1. the editable name (`text.title3` TextInput)
  2. a meta row: the portion text, plus a source chip with the labels `label` → "Read from label", `brand` → "Known product", `estimate` → "Estimated"
  3. a health row: the K12 chip plus the `feedback` sentence (`text.footnote`), hidden without a score
  4. `NutritionReveal` with the scaled calories, protein, carbs and fat
  5. a nutrient row with three cells: Fiber `g`, Sugar `g`, Sodium `mg`, scaled; `—` when `nutrition` is missing and the field is empty
  6. the items list when `items.length > 1`: `name · portion` and `kcal`, with kcal scaled
- [ ] **Servings stepper** (existing UI, steps of 0.5, minimum 0.5): scales all 7 numbers and the item kcal for display and save (`Math.round(value × servings)`).
- [ ] **Adjust numbers**: reveals a grid of 7 numeric inputs (Calories, Protein (g), Carbs (g), Fat (g), Fiber (g), Sugar (g), Sodium (mg)). They are editable only at servings 1, the existing rule.
- [ ] **Something off?**: an input plus a refresh button (disabled while the input is empty or a request is running).
  - It calls `analyzeFood({ previous: { name, portion: portion || '', items: nutrition?.items || [] }, note, goal: state.profile.goalType })`.
  - While running: `<ScanOverlay stages={TEXT_STAGES} />` inside the existing dark `textScan` box; Save is disabled.
  - On `ok`: replace `name`, `portion`, `fields` and `nutrition` with `res.data`, reset servings to 1, clear the note, and fire the success haptic.
  - On failure: a red footnote with `res.error`, or `You're offline. Try again when you're back online.` when `res.offline`, plus the error haptic.
  - Ignore late results after unmount (the existing `requestId` ref pattern).
- [ ] **Save** (the existing green CTA, `Save · ${kcal} kcal`) dispatches `UPDATE_EVENT` with:
  - `{ id, description: name.trim() || 'Meal', note, calories, protein, carbs, fat }`, scaled.
  - `note` is `undefined` when there is no portion, `portion` at servings 1, and `` `${portion} × ${servings}` `` otherwise.
  - Plus `nutrition: { ...nutrition, fiber, sugar, sodium, items: scaledItems }` **only when** `nutrition` exists or a fiber/sugar/sodium field was filled (K1 rule).
  - Then the success haptic and `navigation.goBack()`. No confetti.
- [ ] **Delete** (red text link): `Alert.alert('Delete this meal?', undefined, [Cancel, { text: 'Delete', style: 'destructive' }])`. Delete runs the K3 snippet and then `navigation.goBack()`.
- [ ] Unsaved edits are discarded on back, with no prompt.

### Task D3: `FoodScan.js` cleanup

- [ ] Delete `LoggedCelebration` and any imports only it used (`ConfettiCannon`, `useWindowDimensions`, and anything else left unused).
- [ ] Reword the two Claude comments to "the AI".
- [ ] Remove `PHOTO_STAGES` if nothing uses it any more, and make `TEXT_STAGES` the `ScanOverlay` default.
- [ ] Keep `foodStreak` (C's `FoodCapture` uses it), `ScanOverlay`, `NutritionReveal` and `TEXT_STAGES`.

### Task D4: Calendar

- [ ] `src/navigation/CalendarStack.js`: import `FoodEventScreen` and add `<Stack.Screen name="FoodEvent" component={FoodEventScreen} />` after `Calendar`.
- [ ] `EventEditSheet.js`, food case only:
  - Show the meal: `description || 'Meal'` (`text.headline`) and `` `${calories || 0} kcal · ${protein || 0}p · ${carbs || 0}c · ${fat || 0}f` `` (`text.footnote`).
  - Keep the **Time** picker.
  - Add a **Meal details** button (existing `aiButton` style, `palette.tint` label): `handleClose(); navigation.navigate('FoodEvent', { eventId: event.id });`. Get `navigation` from `useNavigation()`; the sheet is inside the Calendar stack.
  - Remove the food description input, **Fill with AI** and the calorie, protein and carb inputs. The `saveEvent` food case then only sets `payload.time`.
  - Remove the `extractFood` import, and the `protein`/`carbs` state and effect deps if nothing else uses them. Exercise still uses `description` and `calories`.
  - Save, Delete and the other event types are unchanged.

### Task D5: Verify

- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-D"` exits 0.
- [ ] `grep -nE "extractFood|analyzeFoodPhoto|isOnline|LoggedCelebration|photoUri|Claude" src/screens/EventScreens/FoodEventScreen.js src/components/Food/FoodScan.js src/components/Calendar/EventEditSheet.js` prints nothing.
- [ ] Re-read the K7 table: `FoodEvent` is registered in all three stacks, and add mode never navigates to `Home` by name.

---

## Unit E-today (starts after B)

**Files:**
- Create: `src/components/Home/TodayNutrition.js`.
- Delete: `src/components/Home/CalorieProteinGoals.js`.
- Modify: `src/screens/HomeScreen.js`.
- `src/components/Home/StatBar.js`: **no change** (reuse it as is; it clamps progress to 1).

**Interfaces:**
- Consumes:
  - `useStore()` (`state.profile`, `state.loading`) and `useTodayFood()` (K3)
  - `dailyTargets`, `dayGrade` and `gapLine` (K4)
  - `getFoodIdea` (K5)
  - `getTimeNow24h`
- Produces: K8 `TodayNutrition`.

### Task E1: The card

- [ ] `TodayNutrition({ animTrigger = 0, loading = false })` renders one `Card` with `marginHorizontal: SCREEN_MARGIN`, built from:
  - `targets = dailyTargets(state.profile)`
  - `{ date, meals, totals } = useTodayFood()`
  - `grade = dayGrade(meals, targets, { goal: state.profile.goalType, hour: now.getHours() + now.getMinutes() / 60 })`
- [ ] States:
  - `loading`: an eyebrow and three `SkeletonBar`s, as the old `StatCard` did.
  - Normal:
    1. **Hero row:** eaten kcal as the big number, `text.statValue` animated with the old `NumberTicker` (move it here from the deleted file). Then `/ ${targets.calories.toLocaleString()} kcal` in `text.footnote`. On the right, a **grade badge**: a 44 px circle with background `color + '29'` and the letter in `text.headline`, colored per K12; with no meals it shows `–` on `palette.fill`.
    2. The **reason line** under the hero: `grade?.reason ?? 'Log a meal to get today\'s grade.'` (`text.footnote`).
    3. A calories `StatBar` in `palette.green`.
    4. **Four bar rows** for protein, carbs, fat and fiber: a label, `${eaten} / ${target} g`, and a `StatBar` in the K12 color. Pass `animTrigger` through to every StatBar.
    5. A **caps row**: `Sugar ${sugar} / ${sugarMax} g` and `Sodium ${sodium.toLocaleString()} / ${sodiumMax.toLocaleString()} mg` in `text.caption`, each turning `palette.red` when over its max.

### Task E2: What to eat next

- [ ] An eyebrow `WHAT TO EAT NEXT`, then `gapLine(totals, targets) ?? 'Targets hit for today. Nice.'` in `text.subheadline`.
- [ ] **AI idea**, fetched in an effect:
  - The key is `` `${date}|${meals.length}` ``, with a module-level `const ideaCache = new Map()`.
  - If `state.loading` is true, do nothing.
  - On a cache hit, show the cached idea.
  - Otherwise set a 1500 ms debounce timer, then call `getFoodIdea({ goal, targets, totals, meals: meals.map((m) => ({ name: m.description || 'Meal', calories: m.calories || 0, protein: m.protein || 0, health_score: m.nutrition?.health_score ?? null })), localTime: getTimeNow24h() })`.
  - Cleanup clears the timer and ignores late results.
  - Cache only successes.
- [ ] States:
  - fetching: one `SkeletonBar` line
  - success: a row with `Ionicons "sparkles"` (`palette.green`) and the idea in `text.footnote`, `numberOfLines={3}`
  - error or offline: the row is **hidden** (the gap line still shows)

### Task E3: Wire into Home

- [ ] `HomeScreen.js`: replace the `CalorieProteinGoals` import and JSX with `TodayNutrition` (same props, same spot: before `<FoodCapture />`).
- [ ] Delete `src/components/Home/CalorieProteinGoals.js`.

### Task E4: Verify

- [ ] `npm run test:nutrition` passes.
- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-E"` exits 0.
- [ ] `grep -rnE "CalorieProteinGoals|useTodayCaloriesAndProtein" ~/path` prints nothing.

---

## Unit F-profile (starts after B)

**Files:** modify `src/screens/ProfileScreen.js`, `src/components/Profile/QuickStatsRow.js`, `src/components/Profile/AboutYouSection.js` and `src/screens/SettingsScreen.js`.

**Interfaces:**
- Consumes:
  - `suggestGoals` and `dailyTargets` (K4, via `require`)
  - `UPDATE_PROFILE` and the K2 fields
  - `clearPendingFood` (K6)
  - `SegmentedControl` (`src/components/ui/SegmentedControl.js`, unchanged)

### Task F1: Plan card (Goal, Sex, Activity)

- [ ] In `ProfileScreen`, directly under the `Daily goals` section header and above the chips, add a `Card` with three labelled (`text.eyebrow`) `SegmentedControl`s:
  - **Goal**: Gain / Maintain / Lose → `goalType`.
  - **Sex**: Male / Female → `sex`.
  - **Activity**: Sedentary / Light / Moderate / Active → `activity`. Shorten the labels only if they truncate on a 375 pt screen.
- [ ] Each change dispatches `UPDATE_PROFILE { [field]: key }` right away. Unset `sex` and `activity` show no segment selected.

### Task F2: Goal chips and suggestions

- [ ] `QuickStatsRow` gets a new `targets` prop (`dailyTargets(profile)` from `ProfileScreen`). It shows six chips in two rows of three:

  | Key | Label | Icon | Unit | Color |
  |---|---|---|---|---|
  | `calorieGoal` | Calories | `flame-outline` | cal | as today |
  | `proteinGoal` | Protein | `barbell-outline` | g | as today |
  | `waterGoalOz` | Water | `water-outline` | oz | as today |
  | `carbGoal` | Carbs | `pizza-outline` | g | `palette.cyan` |
  | `fatGoal` | Fat | `egg-outline` | g | `palette.purple` |
  | `fiberGoal` | Fiber | `leaf-outline` | g | `palette.indigo` |

- [ ] Chip value: the saved `profile[key]`, else the matching `targets` value, rendered **visibly dimmed** (about 0.5 opacity) to mean "auto".
  - The keys map as calorieGoal→calories, proteinGoal→protein, carbGoal→carbs, fatGoal→fat, fiberGoal→fiber.
  - Water keeps `—` when unset.
  - Tapping a chip opens the existing field editor.
- [ ] `FIELD_CONFIG` adds `carbGoal` ("Daily Carb Goal (g)", e.g. 300), `fatGoal` ("Daily Fat Goal (g)", e.g. 90) and `fiberGoal` ("Daily Fiber Goal (g)", e.g. 35), all numeric. Clearing a value saves `''`, which means auto again.
- [ ] Move the **Suggest goals from profile** button directly under the chips. `handleSuggestGoals` calls `suggestGoals(profile)` on the whole profile.
  - On `error`: show it as today.
  - Otherwise: `UPDATE_PROFILE { calorieGoal: String(s.calories), proteinGoal: String(s.protein), carbGoal: String(s.carbs), fatGoal: String(s.fat), fiberGoal: String(s.fiber) }`.
- [ ] Switch the import to `const { suggestGoals } = require("../utils/goalSuggest");` and `const { dailyTargets } = require("../utils/nutrition");`.

### Task F3: About you

- [ ] `AboutYouSection` `FIELDS`: remove the `calorieGoal` and `proteinGoal` rows; goals live in the chips now. Everything else stays, including `gender`.

### Task F4: Settings

- [ ] `SettingsScreen`: `import { clearPendingFood } from "../store/pendingFood";`. Call `clearPendingFood()` right before `signOut()` in `handleSignOut` and right before `deleteAccount()` in the final delete handler, so queued meal photos never carry over to the next account.

### Task F5: Verify

- [ ] `npm run test:nutrition` passes.
- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-F"` exits 0.
- [ ] `grep -nE "calorieGoal|proteinGoal" src/components/Profile/AboutYouSection.js` prints nothing.

---

## Final integration checks (after all six units)

Run from `~/path`:

- [ ] `npm run test:nutrition && npm run test:store-merge`
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npx expo export --platform ios --output-dir "$SCRATCH/export-final"` exits 0.
- [ ] `grep -rniE "anthropic|claude" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=ios . | grep -v "^./docs/superpowers"` prints nothing.
- [ ] `grep -rnE "extractFood|analyzeFoodPhoto|useTodayCaloriesAndProtein|CalorieProteinGoals|isOnline|LoggedCelebration|photoUri" src` prints nothing.
- [ ] `node "$SCRATCH/queue-harness/harness.mjs" "$PWD/src/store/pendingFood.js" "$SCRATCH/queue-harness/out/final.mjs"`
- [ ] `git status` shows only the files in the ownership table, plus this plan and the deleted `CalorieProteinGoals.js`. Nothing is committed.

The total live spend across units (A only, about $0.01) must stay under the spec's $0.05 cap.

## Deploy (Konrad only; never run by agents)

1. Apply `supabase/migrations/008_food_nutrition.sql` in the Supabase SQL editor **before** any new build syncs. Old builds are unaffected.
2. Merge `food-v2` to `master` and push. Vercel auto-deploys the API; the commit email is `konradicalfischer@gmail.com`. Old builds keep working against the superset API, and `OPENROUTER_API_KEY` must have credits.
3. Remove `ANTHROPIC_API_KEY` from Vercel.
4. Make a new iOS build (Air signing route).

## Known limits (deliberate)

- Meal photos are not kept after logging, so corrections re-estimate from the text (spec out of scope).
- The coach cache lives in memory per app session, so the app makes at most one coach call per date and meal count per launch.
- The queue has no runtime test inside the app. The scratch harness covers its logic, and on-device behaviour is checked after the build.

# Food logging v2 — design

Date: 2026-10-26. Approved by Konrad in chat the same day.

Goal: snap-and-go food logging, full nutrition with guidance for someone trying to **eat more and eat healthier**, and no Claude dependency (the Claude API credits end 2026-10-27).

## Decisions

- **AI provider:** OpenRouter (the pattern `api/ai/summary.ts` already uses: plain `fetch`, `OPENROUTER_API_KEY`). Food model `google/gemini-3.8-flash`, with automatic fallback to `openai/gpt-6-sol` via OpenRouter's `models` array. Reasoning `{ effort: "low" }`. Overridable with the env vars `FOOD_MODEL` and `FOOD_FALLBACK_MODEL`.
  - Bench, 2026-10-26, 6 photos: Gemini 3.8 Flash was exact on a Big Mac, an FDA label and a Starbucks PSL at ~4.5 s and ~$0.0025 per scan. GPT-6 Sol was exact on the Big Mac and the label at ~3.1 s.
- **Remove Claude completely:** drop `@anthropic-ai/sdk` and all Anthropic code.
- **Scope:** build all of it — async logging, full nutrients, health score and tip, day grade, goal modes, and the "what to eat next" coach with an AI meal idea.

## 1. API

### `api/ai/food-photo.ts` (keep the path: installed builds call it)

- Body: `{ image?, text?, note?, goal?, previous? }`.
  - `image`: base64 JPEG. `text`: a typed meal. At least one of `image`, `text` or `previous` is required.
  - `previous: { name, portion, items }` plus a `note` is a correction with no image: re-estimate a logged meal from its earlier analysis and the user's note.
  - `goal`: `"gain" | "maintain" | "lose"`. It drives one prompt line, e.g. "The user is trying to eat more (gain weight) and eat healthier." With no goal, the prompt only says "eat healthier".
- One OpenRouter call:
  - Structured JSON output (`response_format` json_schema, strict), `models: [FOOD_MODEL, FOOD_FALLBACK_MODEL]`, `provider: { require_parameters: true }`.
  - `max_tokens` about 1500, timeout about 25 s.
- Prompt: start from the bench prompt below and keep its rules. Label first, then brand, then visual estimate. Count hidden calories. Macros must agree with calories. Trust the note. Use the health-score rubric. Feedback is one sentence of 20 words or fewer.
- Response (a superset of today's shape, so old builds keep working):
  `{ ok: true, data: { is_food, name, portion, source: "label"|"brand"|"estimate", items: [{ name, portion, calories }], calories, protein, carbs, fat, fiber, sugar, sodium, health_score, feedback } }`.
  - Grams are integers, sodium is in mg, `health_score` is 1–10.
- Quota: `requireUser` key `food_photo`, raised to 40 per day because text entries and corrections count too.
- Errors: OpenRouter 402 or 5xx returns 503 "AI is unavailable, try again later". 429 returns 429. Unparseable output returns 502.

### `api/ai/food-coach.ts` (new)

- Body: `{ goal, targets, totals, meals: [{ name, calories, protein, health_score }], localTime }`.
- Returns `{ ok: true, idea }`. `idea` is one specific next meal or snack, 25 words or fewer. It closes the biggest gaps (protein, fiber, calories for gain), fits the time of day, and favors whole foods.
- Same OpenRouter call style. Quota key `food_coach`, 30 per day.

### `api/_lib/openrouter.ts` (new, small)

A shared call helper for the two food endpoints only. Do not refactor the four existing OpenRouter endpoints.

## 2. Data — `supabase/migrations/008_food_nutrition.sql`

- `events.nutrition jsonb`: `{ fiber, sugar, sodium, health_score, feedback, items, source }`.
  - Calories, protein, carbs and fat stay in their columns, and the portion stays in `note`, so old builds still read them.
- `profile`: `goal_type text`, `sex text`, `activity text`, `carb_goal int`, `fat_goal int`, `fiber_goal int`.
- `src/api/supabaseSync.js`: map `event.nutrition` to and from `row.nutrition`, and map the new profile fields.
- **Apply the migration before any new app build syncs.** PostgREST rejects unknown columns, so event saves would fail.

## 3. App

### Snap and go (`src/store/pendingFood.js`, `src/components/Home/FoodLog.js`)

- Camera or library pick runs `prepareFoodPhoto`, then `queueFood({ image, date, time })`. The user **stays on Home** (no navigation) with a light haptic. The "describe it" text entry queues the same way.
- The queue runs as soon as the item is added when online, up to 3 items in parallel.
  - Each item has a status: `analyzing`, `waiting` (offline, retries as today) or `error` (with Retry and Remove).
- On success the meal is added automatically (`ADD_EVENT` with every field and the `nutrition` object), with a success haptic. There is **no confirm step**.
- `TodayMeals` lists pending rows first:
  - Pending rows show the thumbnail plus an "Analyzing…" shimmer, "Waiting for internet" or the error.
  - Meal rows show name, time, calories, P/C/F and a health-score chip.

### Meal detail (tap a meal): `FoodEventScreen` in edit mode (route param `eventId`)

- Shows the editable name, portion, source chip, calories, every nutrient, the items, and the health score with its tip.
- Actions:
  - Servings stepper that scales every number.
  - "Adjust numbers".
  - "Something off?" correction: POST `food-photo` with `{ previous, note }` and replace the numbers.
  - Delete.
- Saving dispatches `UPDATE_EVENT`.

### Today card (replaces `CalorieProteinGoals`)

- Calories against target as the hero number, then bars for protein, carbs, fat and fiber.
- Sugar and sodium are shown as caps, with a warning color when over.
- Day grade A–F with a one-line reason.
- "What to eat next":
  - A local gap line, e.g. "~60 g protein · 15 g fiber · 900 kcal to go".
  - The AI idea from `food-coach`, fetched when the meal count changes (debounced) and cached per date plus meal count. Hidden when offline or on error.

### Goals (`src/utils/goalSuggest.js`, Profile)

- Profile gains Goal (Gain / Maintain / Lose, default Gain for Konrad's flow), Sex and Activity.
- `suggestGoals` returns calories, protein, carbs, fat, fiber, sugarMax and sodiumMax:
  - Maintenance = Mifflin-St Jeor × activity factor (sedentary 1.2, light 1.375, moderate 1.55, active 1.725).
  - Gain = maintenance + 400 kcal, protein 1.8 g/kg. Maintain: protein 1.6 g/kg. Lose = maintenance − 500 kcal, protein 2.0 g/kg.
  - Fat 30% of kcal, carbs the remainder.
  - Fiber 14 g per 1000 kcal, clamped to 25–45 g.
  - sugarMax = 10% of kcal ÷ 4. sodiumMax = 2300 mg.
- Goals the user saved override the suggestions.

### Day grade: a pure function in `src/utils/nutrition.js`

- Components:

  | Component | Weight | Score |
  |---|---|---|
  | Quality | 30% | calorie-weighted mean `health_score` × 10 |
  | Protein | 25% | vs paced target |
  | Calories | 20% | vs paced target. For gain, undershooting costs points; for lose, overshooting does |
  | Fiber | 15% | vs paced target |
  | Sugar | 10% | full when ≤ cap, falling linearly to 0 at 2× the cap |

- Pace = clamp((local hour − 7) ÷ 13, 0.25, 1), so a lunchtime grade isn't an F for "missing" dinner.
- Grades: A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, otherwise F.
- Check: a day of coffee and ice cream at the calorie goal grades D or F, and a balanced day grades A.
- Leave one runnable node-assert check (an npm script) covering targets and the grade.

## 4. Verify and ship

- `npx tsc --noEmit` passes for the API. The JS bundle builds (`npx expo export --platform ios`). The node check passes.
- No remaining `anthropic` references outside `node_modules`.
- Live prompt check against bench photos through OpenRouter, capped at $0.05.
- Deploy order:
  1. Migration.
  2. Merge to master and push (Vercel auto-deploys the API; commit email konradicalfischer@gmail.com).
  3. Remove `ANTHROPIC_API_KEY` from Vercel.
  4. New iOS build (Air signing route).

## Out of scope

- Saved meal photos and thumbnails after logging (corrections use the text re-estimate).
- Refactoring the four existing OpenRouter endpoints.
- Barcode scanning.

## Bench prompt (starting point)

```
You are a dietitian-level nutrition analyst. The user photographed something they are about to eat or drink. The user is trying to eat more (gain weight) and eat healthier.

Work out what it is and its nutrition, in this order of preference:
1. A nutrition facts label is visible: copy the per-serving values exactly, then multiply by the servings shown (a single-serve package = the whole package; a label on its own = 1 serving).
2. A recognizable branded or restaurant product: use its published nutrition for the size shown.
3. Otherwise identify each food, estimate grams from visual cues (dinner plate ~26 cm, fork ~19 cm, a hand, the container) and use standard food composition data. Count hidden calories: cooking oil, butter, dressing, sauce, sugar in drinks.

Rules:
- Totals cover everything shown, at the portion shown. Macros must agree with calories (4/4/9 kcal per g).
- Never give a real food 0 calories. Only water, black coffee, plain tea and similar are 0.
- portion: short and human, e.g. "1 bowl, ~350 g" or "1 bar (60 g)".
- items: one entry per distinct food (a packaged product is one item).
- If the user adds a note, trust it over the photo (e.g. "ate half").
- health_score 1-10 judges food quality, not calories: 9-10 whole or minimally processed, protein and fiber rich, produce; 6-8 decent with some refined parts; 3-5 refined or processed, low protein or fiber; 1-2 mostly sugar, deep fried or alcohol. Calorie-dense whole foods (nuts, olive oil, avocado, salmon, whole milk) score well.
- feedback: one sentence, at most 20 words: the biggest strength or gap, plus one concrete add or swap.
- If there is no food or drink in the photo, set is_food to false and the numbers to 0.
```

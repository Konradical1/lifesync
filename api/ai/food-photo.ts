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

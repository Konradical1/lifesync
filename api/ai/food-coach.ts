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

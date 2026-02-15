import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FAST_MODEL = "openai/gpt-4.1-mini";
const MAX_BODY_CHARS = 2000;
const TIMEOUT_MS = 5000;

const FOOD_SYSTEM = `You are a nutrition assistant. From the user's food description, output a single JSON object with estimated macros.

CRITICAL: Never return 0 for calories, protein, carbs, or fat for any real food (meals, snacks, bars, drinks with calories). Only use 0 for things like water or black coffee. Every real food has calories and at least some protein, carbs, or fat—always estimate reasonable numbers.

Rules:
- Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.
- Use exactly these keys (lowercase): description, calories, protein, carbs, fat.
- description: short food name. calories, protein, carbs, fat: integers only.

Examples of correct outputs:
- "oatmeal with banana" -> {"description":"Oatmeal with banana","calories":320,"protein":12,"carbs":58,"fat":6}
- "protein bar" -> {"description":"Protein bar","calories":200,"protein":20,"carbs":22,"fat":5}
- "grilled chicken salad" -> {"description":"Grilled chicken salad","calories":420,"protein":35,"carbs":12,"fat":28}
- "water" -> {"description":"Water","calories":0,"protein":0,"carbs":0,"fat":0}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { text, type } = req.body ?? {};
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) {
    return res.status(400).json({ error: "Missing or empty text" });
  }
  if (raw.length > MAX_BODY_CHARS) {
    return res.status(400).json({ error: "Text too long" });
  }

  const eventType = type === "food" ? "food" : "generic";
  const systemContent =
    eventType === "food"
      ? FOOD_SYSTEM
      : "Extract structured health event data. Respond only with JSON.";
  const userContent =
    eventType === "food"
      ? `Food: "${raw}". Estimate macros (calories, protein, carbs, fat). Use realistic numbers—no zeros unless it's water or black coffee. JSON only.`
      : `Event type: ${eventType}\nText: ${raw}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FAST_MODEL,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(502).json({ error: "Empty AI response" });
    }

    // Strip markdown code blocks if present (e.g. ```json ... ```)
    let jsonStr = content.trim();
    const codeBlock = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      const get = (key: string) =>
        parsed[key] ?? parsed[key.charAt(0).toUpperCase() + key.slice(1)];
      const num = (v: unknown): number => {
        if (v == null) return 0;
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      };
      const data = {
        description: typeof get("description") === "string" ? String(get("description")).trim() : undefined,
        calories: num(get("calories")),
        protein: num(get("protein")),
        carbs: num(get("carbs")),
        fat: num(get("fat")),
      };
      return res.json({ ok: true, data });
    } catch {
      return res.json({ ok: true, raw: content });
    }
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

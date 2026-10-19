/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "../_lib/auth";

const MODEL = "claude-opus-5-5";
// App resizes to ~1024px JPEG (~150 KB base64); Vercel caps bodies at 4.5 MB.
const MAX_IMAGE_CHARS = 3_000_000;
const MAX_NOTE_CHARS = 300;

const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });

const SYSTEM = `You are a nutrition expert looking at a photo someone took of what they are about to eat.

Work out what it is and its nutrition, in this order of preference:
1. A nutrition facts label is visible: read the per-serving values exactly as printed, then estimate how many servings are in the photo (a single-serve package = the whole package).
2. A recognizable branded or restaurant product (packaging, logo, menu item): use that product's published nutrition.
3. Otherwise identify each food item, estimate its portion in grams from visual cues (a dinner plate is ~26 cm, a fork ~19 cm, a hand, the container), and estimate macros.

Rules:
- Totals are for everything shown, at the portion shown.
- Never give a real food 0 calories. Only water, black coffee, plain tea and similar are 0.
- portion: short and human, e.g. "1 bowl, ~350 g" or "1 bar (60 g)".
- items: one entry per distinct food (a packaged product is one item).
- If the user adds a note, trust it over the photo (e.g. "ate half").
- If there is no food or drink in the photo, set is_food to false and the numbers to 0.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "name", "portion", "source", "items", "calories", "protein", "carbs", "fat"],
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
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          calories: { type: "integer" },
        },
      },
    },
    calories: { type: "integer" },
    protein: { type: "integer", description: "grams" },
    carbs: { type: "integer", description: "grams" },
    fat: { type: "integer", description: "grams" },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireUser(req, res);
  if (!userId) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { image, note } = (req.body ?? {}) as { image?: unknown; note?: unknown };
  if (typeof image !== "string" || !image) {
    return res.status(400).json({ error: "Missing image" });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: "Image too large" });
  }
  const noteText = typeof note === "string" ? note.trim().slice(0, MAX_NOTE_CHARS) : "";

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: noteText ? `Note from me: ${noteText}` : "What is this and what's its nutrition?" },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "Couldn't analyze this photo" });
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return res.status(502).json({ error: "Empty AI response" });
    }
    return res.json({ ok: true, data: JSON.parse(text.text) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "AI is busy, try again in a moment" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic error", err.status, err.message);
      return res.status(502).json({ error: "AI request failed" });
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

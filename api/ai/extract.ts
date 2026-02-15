import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FAST_MODEL = "openai/gpt-4.1-mini";
const MAX_BODY_CHARS = 2000;
const TIMEOUT_MS = 5000;

const FOOD_SYSTEM = `You are a nutrition assistant. Extract food and macros from the user's text.
Respond ONLY with a single JSON object, no markdown, no explanation. Use this exact shape:
{"description":"short food name","calories":number,"protein":number,"carbs":number,"fat":number}
Use 0 for any unknown value. Keep description brief (e.g. "Oatmeal with banana").`;

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
  const userContent = `Event type: ${eventType}\nText: ${raw}`;

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

    // Optional: parse and re-emit clean JSON so frontend gets a stable shape
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return res.json({ ok: true, data: parsed });
    } catch {
      return res.json({ ok: true, raw: content });
    }
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

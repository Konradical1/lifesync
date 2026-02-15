import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

const SYSTEM = `You are a supportive wellness assistant. Given a day's logged events (food, exercise, sleep, meds, etc.), journal entry, and mood, write a short 2–3 sentence daily summary. Be warm and specific. Mention what they did well. If there's little data, say something encouraging to log more. Keep tone concise and positive.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { date, events = [], journal = [], mood } = req.body ?? {};
  const dateStr = typeof date === "string" ? date : "";

  const eventsText =
    events.length > 0
      ? events
          .map(
            (e: { type?: string; description?: string; time?: string; duration?: number; calories?: number; name?: string; note?: string }) =>
              `- ${e.type}: ${e.description ?? e.name ?? e.note ?? ""} ${e.time ?? ""} ${e.duration ? e.duration + " min" : ""} ${e.calories ? e.calories + " cal" : ""}`.trim()
          )
          .join("\n")
      : "No events logged.";
  const journalText =
    journal.length > 0
      ? journal.map((j: { text?: string; time?: string }) => `[${j.time ?? ""}] ${j.text ?? ""}`).join("\n")
      : "No journal entry.";
  const moodText = mood && (mood.emotion || mood.intensity) ? `Mood: ${mood.emotion ?? "—"}, intensity ${mood.intensity ?? "—"}` : "No mood logged.";

  const userContent = `Date: ${dateStr || "Today"}\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n\nWrite the 2–3 sentence daily summary now.`;

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
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
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

    const summary = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return res.json({ summary });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

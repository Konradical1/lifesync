import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

const SYSTEM = `You are a supportive wellness coach. Given the user's recent logged events (food, exercise, sleep, meds), journal entries, and moods over the past days, write 3–5 short insights or observations. Use bullet points or very short paragraphs. Be specific (reference their data when relevant), encouraging, and actionable. Focus on patterns, consistency, and gentle suggestions—never judgmental.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { events = [], journal = [], moods = [] } = req.body ?? {};

  const eventsByDate: Record<string, string[]> = {};
  for (const e of events) {
    const d = e.date ?? "unknown";
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(
      `${e.type}: ${e.description ?? e.name ?? e.note ?? ""} ${e.time ?? ""} ${e.duration ? e.duration + " min" : ""} ${e.calories != null ? e.calories + " cal" : ""}`.trim()
    );
  }
  const eventsText =
    Object.keys(eventsByDate).length > 0
      ? Object.entries(eventsByDate)
          .map(([date, list]) => `${date}: ${list.join("; ")}`)
          .join("\n")
      : "No events in this period.";
  const journalText =
    journal.length > 0
      ? journal.map((j: { date?: string; text?: string; time?: string }) => `[${j.date ?? ""} ${j.time ?? ""}] ${j.text ?? ""}`).join("\n")
      : "No journal entries.";
  const moodEntries = Array.isArray(moods) ? moods : Object.entries(moods).map(([date, m]) => ({ ...(m as object), date }));
  const moodsText =
    moodEntries.length > 0
      ? moodEntries
          .map((m: { date?: string; emotion?: string; intensity?: number }) => `${m.date ?? ""}: ${m.emotion ?? "—"} (${m.intensity ?? "—"})`)
          .join("\n")
      : "No mood data.";

  const userContent = `Recent data:\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\nMoods:\n${moodsText}\n\nWrite 3–5 short insights now.`;

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

    const insights = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return res.json({ insights });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

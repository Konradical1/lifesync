import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

const SYSTEM = `You are a supportive wellness coach. Given the user's recent logged events (food, exercise, sleep, meds), journal entries, and moods over the past days, write 3–5 short insights or observations.

You MUST format your response exactly like this so the app can show a big heading, smaller headings, highlights, and icons:

1) BIG HEADING (one only, at the very top)
   On the first line, write a single # followed by a space and your main headline (e.g. "# Your week at a glance" or "# 3 insights from your data").

2) SECTION HEADINGS (smaller)
   On their own line, use ## followed by a space (e.g. "## Sleep" or "## Nutrition"). Optionally start with an emoji icon for that section.

3) SUB-HEADINGS (even smaller)
   Use ### followed by a space when you need a sub-section (e.g. "### What stood out").

4) HIGHLIGHT important words and numbers in blue
   Wrap any important number or key term in **double asterisks**. The app will show these in blue.
   Example sentence: "You logged **3** **workouts** and **7 hours** of **sleep** this week—**consistent** routine."
   Another: "**Nutrition** looks **balanced** with **2** meals logged today."

5) ICONS (emoji)
   Use relevant emoji at the start of sections or key points so the response feels visual and scannable. Examples:
   😴 sleep  🍎 nutrition/food  💪 exercise  📝 journal  😊 mood  💊 meds  ✨ summary/tip  📈 progress
   You can put the emoji in the heading line (e.g. "## 😴 Sleep") or at the start of a bullet.

Use short paragraphs or bullets under each header. Be specific (reference their data), encouraging, and actionable. Never judgmental.`;

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

  const userContent = `Recent data:\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\nMoods:\n${moodsText}\n\nWrite 3–5 insights. Format: first line # Big heading, then ## Section headings (add emoji like 😴 🍎 💪), then **highlight** numbers and key terms. Example: "You logged **3** **workouts** this week."`;

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

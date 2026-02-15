import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

const SYSTEM = `You are a supportive wellness coach. Given the user's recent logged events (food, exercise, sleep, meds), journal entries, and moods over the past days, write 3–5 short insights or observations.

Format your response so the app can show a big heading, smaller headings, icons, and three levels of emphasis (italic, bold, blue):

1) BIG HEADING (one only, at the very top)
   First line: # followed by a space and your main headline (e.g. "# Your week at a glance").

2) SECTION HEADINGS (smaller)
   On their own line: ## followed by a space. Use an icon at the start with [icon:name] then the title (e.g. "## [icon:sleep] Sleep" or "## [icon:nutrition] Nutrition").

3) SUB-HEADINGS (even smaller)
   Use ### followed by a space (e.g. "### What stood out").

4) ICONS
   Use [icon:name] where name is exactly one of: sleep, food, exercise, meds, journal, mood, nutrition, summary, progress. Put them in section headings or at the start of a bullet (e.g. "## [icon:sleep] Sleep" or "- [icon:food] You had **2** meals.").

5) EMPHASIS (three levels)
   - *italic* for occasional emphasis or tone (one asterisk each side). Example: "That's *really* helpful."
   - **bold** for somewhat important things (two asterisks each side). Example: "Your **sleep** was **consistent**."
   - ***blue*** for super important only—key numbers and the most important terms (three asterisks each side). The app will color these blue. Use sparingly. Example: "You logged ***3*** ***workouts*** and ***7 hours*** of sleep this week."

Example sentence using all three: "Your **nutrition** looks ***balanced***—***2*** meals logged and *plenty* of variety."
Another: "## [icon:sleep] Sleep — You got ***6.5 hours*** last night. **Consistency** is improving."

Use short paragraphs or bullets. Be specific, encouraging, and actionable. Never judgmental.`;

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

  const userContent = `Recent data:\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\nMoods:\n${moodsText}\n\nWrite 3–5 insights. Format: # Big heading, then ## [icon:name] Section (icons: sleep, food, exercise, meds, journal, mood, nutrition, summary, progress). Use *italic* for tone, **bold** for somewhat important, ***blue*** for super important only. Example: "You logged ***3*** **workouts** this week."`;

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

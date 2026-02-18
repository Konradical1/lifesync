/**
 * Vercel serverless API: AI insights from events, journal, and moods.
 *
 * DEPLOY: After editing this file (or any file under api/), push to git so Vercel updates the API.
 */
import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

/** Format YYYY-MM-DD as "Monday, February 16, 2026" or "Today" / "Yesterday" relative to ref. */
function formatDateWithWeekday(dateStr: string, todayStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  if (dateStr === todayStr) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (dateStr === yStr) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const SYSTEM = `You are a supportive wellness coach. Given the user's recent logged events (food, exercise, sleep, meds), journal entries, and moods over the past days, write 3–5 short insights or observations.

DATE RULES: When you refer to a specific day, always use the day of the week (e.g. "Monday" or "Monday, February 16"). Never say only "Feb 16" or "2/16". Use "Today" or "Yesterday" when that's what the data label says. The data you receive uses labels like "Today", "Yesterday", or "Monday, February 16, 2026" — use that same style in your response.

FORMATTING: Use clean, minimal markdown. One blank line between sections, not between every line. No trailing spaces or extra punctuation.

Structure your response so the app can show a big heading, section headings, and three levels of emphasis (italic, bold, blue):

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
   - ***blue***: Use for exactly ONE term per section only. Each ## section (e.g. Sleep, Nutrition, Activity, Mood) must have at most one ***blue*** phrase—pick the single most important number or takeaway for that section. The app colors these blue. Do not use ***blue*** multiple times in the same section. Example: In a Sleep section you might write "You got ***7 hours*** on **Tuesday**." (only "7 hours" in blue). In Nutrition, one blue term only, e.g. "***3*** meals logged."

Example: "## [icon:sleep] Sleep — You got ***6.5 hours*** on **Tuesday**. **Consistency** is improving." (one blue term in that section)
Example: "## [icon:nutrition] Nutrition — Your **meals** looked ***balanced*** with good variety." (one blue term)

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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const eventsByDate: Record<string, string[]> = {};
  for (const e of events) {
    const d = e.date ?? "unknown";
    if (!eventsByDate[d]) eventsByDate[d] = [];
    let line: string;
    if (e.type === "sleep" && (e.startTime != null || e.endTime != null)) {
      const start = (e as { startTime?: string }).startTime ?? "—";
      const end = (e as { endTime?: string }).endTime ?? "—";
      line = `sleep: ${start}–${end}`;
    } else {
      line = `${e.type}: ${e.description ?? e.name ?? e.note ?? ""} ${e.time ?? ""} ${e.duration ? e.duration + " min" : ""} ${e.calories != null ? e.calories + " cal" : ""}`.trim();
    }
    eventsByDate[d].push(line);
  }
  const eventsText =
    Object.keys(eventsByDate).length > 0
      ? Object.entries(eventsByDate)
          .map(([date, list]) => `${formatDateWithWeekday(date, todayStr)}: ${list.join("; ")}`)
          .join("\n")
      : "No events in this period.";
  const journalText =
    journal.length > 0
      ? journal
          .map((j: { date?: string; text?: string; time?: string }) => {
            const label = j.date ? formatDateWithWeekday(j.date, todayStr) : "";
            return `[${label} ${j.time ?? ""}] ${j.text ?? ""}`;
          })
          .join("\n")
      : "No journal entries.";
  const moodEntries = Array.isArray(moods) ? moods : Object.entries(moods).map(([date, m]) => ({ ...(m as object), date }));
  const moodsText =
    moodEntries.length > 0
      ? moodEntries
          .map((m: { date?: string; emotion?: string; intensity?: number }) => {
            const label = m.date ? formatDateWithWeekday(m.date, todayStr) : "";
            return `${label}: ${m.emotion ?? "—"} (${m.intensity ?? "—"})`;
          })
          .join("\n")
      : "No mood data.";

  const userContent = `Reference: today's date is ${formatDateWithWeekday(todayStr, todayStr)} (${todayStr}).

Recent data:

Events:
${eventsText}

Journal:
${journalText}

Moods:
${moodsText}

Write 3–5 insights. Use day-of-week when referring to dates (e.g. "Monday" or "Today"). Format: # Big heading, then ## [icon:name] Section. Use ***blue*** for only one term per section (e.g. one in Sleep, one in Nutrition). Use *italic* and **bold** freely. Keep formatting clean.`;

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

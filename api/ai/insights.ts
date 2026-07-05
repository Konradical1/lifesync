/**
 * Vercel serverless API: AI insights from events, journal, and moods.
 *
 * DEPLOY: After editing this file (or any file under api/), push to git so Vercel updates the API.
 */
import type { VercelRequest, VercelResponse } from "vercel";
import { requireUser } from "../_lib/auth";

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

const SYSTEM = `You are a supportive wellness coach. Given the user's profile context and their recent logged events (food, exercise, sleep, meds), journal entries, and moods, write structured insights. Use any profile details (goals, medical conditions, user-provided context) to personalize your advice — for example, compare intake against their calorie/protein goals, note progress toward a weight goal, or factor in medical conditions when making suggestions.

CRITICAL — DATE: You will be told "Reference: today's date is Today (YYYY-MM-DD)". Use that date as TODAY. When the data says "Today", that is the user's current day. When you refer to days, use "Today", "Yesterday", or the weekday (e.g. "Monday") — never say a date is "yesterday" if the data is labeled "Today".

STRUCTURE — Use exactly these sections in this order. Include every section; if no data, write one short line (e.g. "No sleep logged — log sleep to see patterns.").
1) One main headline: first line must be "# Your week at a glance" (or similar).
2) ## [icon:sleep] Sleep — 1–2 lines on sleep. One ***blue*** term max (e.g. ***7 hours***).
3) ## [icon:nutrition] Meals — 1–2 lines on food/nutrition. One ***blue*** term max.
4) ## [icon:mood] Mood — 1–2 lines on mood. One ***blue*** term max.
5) ## [icon:exercise] Activity — 1–2 lines on exercise/activity if any; otherwise one line like "No exercise logged."
6) ## [icon:progress] Moving forward — 1–3 short, actionable suggestions (what to improve or try next). No ***blue*** needed here; use **bold** for the action if you like.

FORMATTING RULES:
- Section headings: ## followed by space, then [icon:name] then title (e.g. "## [icon:sleep] Sleep").
- Icons: name is one of sleep, food, exercise, meds, journal, mood, nutrition, summary, progress.
- Keep each section body on the same line as the section heading when possible, or one line below. Do NOT put **bold** or ***blue*** on their own line — always keep them inline with surrounding text (e.g. "You got ***7 hours*** of sleep." not "You got\n***7 hours***\nof sleep.").
- Emphasis: *italic* for tone, **bold** for importance, ***blue*** for exactly one key term per section (except Moving forward). One blank line between sections only.

Be specific, encouraging, and actionable. Never judgmental.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireUser(req, res);
  if (!userId) return;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { events = [], journal = [], moods = [], today: clientToday, profile } = req.body ?? {};

  // Use client's "today" (YYYY-MM-DD) so insights match the user's timezone; fallback to server date
  const todayStr =
    typeof clientToday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
      ? clientToday
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

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

  // Build profile context if available
  const profileLines: string[] = [];
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, string>;
    if (p.name) profileLines.push(`Name: ${p.name}`);
    if (p.age) profileLines.push(`Age: ${p.age}`);
    if (p.gender) profileLines.push(`Gender: ${p.gender}`);
    if (p.height) profileLines.push(`Height: ${p.height}`);
    if (p.weight) profileLines.push(`Current weight: ${p.weight} lbs`);
    if (p.weightGoal) profileLines.push(`Weight goal: ${p.weightGoal} lbs`);
    if (p.calorieGoal) profileLines.push(`Daily calorie goal: ${p.calorieGoal}`);
    if (p.proteinGoal) profileLines.push(`Daily protein goal: ${p.proteinGoal}g`);
    if (p.waterGoalOz) profileLines.push(`Daily water goal: ${p.waterGoalOz} oz`);
    if (p.medicalConditions) profileLines.push(`Medical conditions/notes: ${p.medicalConditions}`);
    if (p.aiContext) profileLines.push(`Additional context from user: ${p.aiContext}`);
  }
  const profileText = profileLines.length > 0
    ? `\nUser profile:\n${profileLines.join("\n")}\n`
    : "";

  const userContent = `Reference: today's date is ${formatDateWithWeekday(todayStr, todayStr)} (${todayStr}). So "Today" in the data below means ${todayStr}.
${profileText}
Recent data:

Events:
${eventsText}

Journal:
${journalText}

Moods:
${moodsText}

Respond with the structured sections: # headline, then ## [icon:sleep] Sleep, ## [icon:nutrition] Meals, ## [icon:mood] Mood, ## [icon:exercise] Activity, ## [icon:progress] Moving forward. Keep **bold** and ***blue*** inline (same line as surrounding text). One ***blue*** term per section except Moving forward. Use the user's profile to personalize advice — reference their goals, conditions, and context where relevant.`;

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

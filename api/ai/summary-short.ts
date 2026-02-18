/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 10000;

const SYSTEM = `You are a supportive, honest wellness assistant. You receive: time of day, the user's first name (if provided), the day's data (events: food, sleep, exercise, meds, etc.; journal; mood; water intake), and profile goals (e.g. water oz, calories, protein). Use ALL of this data to personalize the summary. Be helpful, not just hopeful: give one genuine positive and one concrete improvement when the data supports it.

Your reply must be valid JSON only, no other text:
{"summary": "...", "highlight": "oneword"}

Rules for "summary":
- Start with a short, time-based greeting. If name is given: "Good morning, Alex." or "Good afternoon, Sarah!" If no name: "Good morning." or a brief time-based line.
- Then write exactly TWO short sentences:
  1. One sentence of good: something they did well or that's on track based on real data (e.g. "You logged breakfast and your mood." or "Sleep and exercise look solid."). If there's little data, acknowledge what they did log or that they're checking in.
  2. One sentence of improvement: one specific, actionable suggestion based on the data. Be intelligent: compare intake to goals and time of day. Examples: if water is low for the time of day vs their daily goal, say "Try to drink more water to hit your goal." If they haven't logged much, "Log a meal or some water to get a fuller picture." If mood is low, a gentle nudge (e.g. "A short walk might help."). Never say something is "on track" when the numbers clearly show they're behind (e.g. 16 oz with a 120 oz goal halfway through the day = suggest drinking more).
- Tone: warm and supportive but honest. Total summary around 45–55 words. No bullet points or em dashes.

Rules for "highlight":
- Pick exactly two word from your summary, one from each sentence (from the two body sentences, not the greeting) to emphasize. Return that word in "highlight".`;

type SummaryShortBody = {
  date?: string;
  events?: unknown[];
  journal?: unknown[];
  mood?: { emotion?: string; intensity?: string | number };
  waterEntries?: Array<{ date?: string; time?: string; oz?: number }>;
  profile?: Record<string, unknown>;
  refresh?: boolean;
  /** User's local hour (0-23) so greeting matches their timezone. */
  localHour?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const body = (req.body ?? {}) as SummaryShortBody;
  const { date, events = [], journal = [], mood, waterEntries = [], profile, refresh, localHour } = body;
  const dateStr = typeof date === "string" ? date : "";

  const hour = typeof localHour === "number" && localHour >= 0 && localHour <= 23
    ? localHour
    : new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const firstName = profile && typeof profile === "object" && typeof (profile as Record<string, unknown>).name === "string"
    ? String((profile as Record<string, unknown>).name).trim().split(/\s+/)[0] || ""
    : "";

  const eventsText =
    events.length > 0
      ? events
          .map(
            (e: { type?: string; description?: string; time?: string; duration?: number; calories?: number; protein?: number; name?: string; note?: string }) =>
              `- ${e.type}: ${e.description ?? e.name ?? e.note ?? ""} ${e.time ?? ""} ${e.duration ? e.duration + " min" : ""} ${e.calories ? e.calories + " cal" : ""} ${e.protein != null ? e.protein + " g protein" : ""}`.trim()
          )
          .join("\n")
      : "No events logged.";
  const journalText =
    journal.length > 0
      ? journal.map((j: { text?: string; time?: string }) => `[${j.time ?? ""}] ${j.text ?? ""}`).join("\n")
      : "No journal entry.";
  const moodText =
    mood && (mood.emotion || mood.intensity != null)
      ? `Mood: ${mood.emotion ?? "—"}, intensity ${mood.intensity ?? "—"}`
      : "No mood logged.";

  const waterList = Array.isArray(waterEntries) ? waterEntries : [];
  const waterTotalOz = waterList.reduce((sum, w) => sum + (Number((w as { oz?: number }).oz) || 0), 0);
  const waterText =
    waterList.length > 0
      ? `Water: ${waterTotalOz} oz total today (${waterList.length} log${waterList.length === 1 ? "" : "s"})`
      : "No water logged today.";

  const profileParts: string[] = [];
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (p.calorieGoal != null && String(p.calorieGoal).trim()) profileParts.push(`Daily calorie goal: ${String(p.calorieGoal).trim()}`);
    if (p.proteinGoal != null && String(p.proteinGoal).trim()) profileParts.push(`Daily protein goal (g): ${String(p.proteinGoal).trim()}`);
    if (p.waterGoalOz != null && String(p.waterGoalOz).trim()) profileParts.push(`Daily water goal (oz): ${String(p.waterGoalOz).trim()}`);
  }
  const profileText = profileParts.length > 0 ? `Profile: ${profileParts.join(", ")}` : "";

  const refreshHint = refresh ? "\nThe user is refreshing — give a different greeting or phrasing this time (vary the angle or wording). " : "";
  const userContent = `Time of day: ${timeOfDay}.${firstName ? ` User's first name: ${firstName}.` : ""}\nDate: ${dateStr || "Today"}${refreshHint}\n${profileText ? `${profileText}\n` : ""}\nEvents (food, sleep, exercise, meds, etc.):\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n${waterText}\n\nUse the data above: greeting, then one sentence of good and one sentence of improvement (compare water/calories/protein to goals and time of day where relevant). Reply with JSON only: {"summary": "Greeting. Good sentence. Improvement sentence.", "highlight": "oneword"}.`;

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

    const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    let summary = "";
    let highlight = "";
    try {
      const parsed = JSON.parse(raw) as { summary?: string; highlight?: string };
      summary = typeof parsed.summary === "string" ? parsed.summary.trim() : raw;
      highlight = typeof parsed.highlight === "string" ? parsed.highlight.trim() : "";
    } catch {
      summary = raw;
    }
    return res.json({ summary, highlight: highlight || undefined });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(504).json({ error: message });
  }
}

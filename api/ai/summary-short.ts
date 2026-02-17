/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 10000;

const SYSTEM = `You are a supportive wellness assistant. Given a day's logged events, journal, and mood, reply with exactly ONE short sentence for the home screen: a warm, encouraging summary (e.g. "You're on track today." or "Good logging — keep it up."). No bullet points, no multiple sentences. If there's little or no data, say one encouraging line like "Start logging to see your day summary." Stay positive and under 15 words.`;

type SummaryShortBody = {
  date?: string;
  events?: unknown[];
  journal?: unknown[];
  mood?: { emotion?: string; intensity?: string | number };
  profile?: Record<string, unknown>;
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
  const { date, events = [], journal = [], mood, profile } = body;
  const dateStr = typeof date === "string" ? date : "";

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

  const profileParts: string[] = [];
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (p.calorieGoal != null && String(p.calorieGoal).trim()) profileParts.push(`Daily calorie goal: ${String(p.calorieGoal).trim()}`);
    if (p.proteinGoal != null && String(p.proteinGoal).trim()) profileParts.push(`Daily protein goal (g): ${String(p.proteinGoal).trim()}`);
  }
  const profileText = profileParts.length > 0 ? `Profile: ${profileParts.join(", ")}` : "";

  const userContent = profileText
    ? `Date: ${dateStr || "Today"}\n${profileText}\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n\nReply with exactly one short sentence for the home screen.`
    : `Date: ${dateStr || "Today"}\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n\nReply with exactly one short sentence for the home screen.`;

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

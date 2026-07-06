/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import { requireUser } from "../_lib/auth";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4.1-mini";
const TIMEOUT_MS = 15000;

interface SummaryEvent {
  type?: string;
  description?: string;
  time?: string;
  duration?: number;
  calories?: number;
  protein?: number;
  name?: string;
  note?: string;
}

interface SummaryJournalEntry {
  text?: string;
  time?: string;
}

interface SummaryMood {
  emotion?: string;
  intensity?: number;
}

interface SummaryBody {
  date?: unknown;
  events?: unknown;
  journal?: unknown;
  mood?: SummaryMood;
  profile?: unknown;
}

const SYSTEM = `You are a supportive wellness assistant. Given a day's logged events (food, exercise, sleep, meds, etc.), journal entry, mood, and optionally the user's profile (name, age, height, weight, medical conditions, daily calorie goal, daily protein goal), write a short 2–3 sentence daily summary. Be warm and specific. Mention what they did well. If they have calorie or protein goals and logged food, you may reference progress toward those goals (e.g. "You're at X of your Y cal goal"). If they have medical conditions, be mindful of them in tone—never give medical advice, just supportive context. If there's little data, say something encouraging to log more. Keep tone concise and positive.`;

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

  const body = (req.body ?? {}) as SummaryBody;
  const { date, mood, profile } = body;
  const events = Array.isArray(body.events) ? (body.events as SummaryEvent[]) : [];
  const journal = Array.isArray(body.journal) ? (body.journal as SummaryJournalEntry[]) : [];
  const dateStr = typeof date === "string" ? date : "";

  const eventsText =
    events.length > 0
      ? events
          .map(
            (e) =>
              `- ${e.type}: ${e.description ?? e.name ?? e.note ?? ""} ${e.time ?? ""} ${e.duration ? e.duration + " min" : ""} ${e.calories ? e.calories + " cal" : ""} ${e.protein != null ? e.protein + " g protein" : ""}`.trim()
          )
          .join("\n")
      : "No events logged.";
  const journalText =
    journal.length > 0
      ? journal.map((j) => `[${j.time ?? ""}] ${j.text ?? ""}`).join("\n")
      : "No journal entry.";
  const moodText = mood && (mood.emotion || mood.intensity) ? `Mood: ${mood.emotion ?? "—"}, intensity ${mood.intensity ?? "—"}` : "No mood logged.";

  const profileParts: string[] = [];
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (p.name && String(p.name).trim()) profileParts.push(`Name: ${String(p.name).trim()}`);
    if (p.age && String(p.age).trim()) profileParts.push(`Age: ${String(p.age).trim()}`);
    if (p.height && String(p.height).trim()) profileParts.push(`Height: ${String(p.height).trim()}`);
    if (p.weight && String(p.weight).trim()) profileParts.push(`Weight: ${String(p.weight).trim()}`);
    if (p.calorieGoal != null && String(p.calorieGoal).trim()) profileParts.push(`Daily calorie goal: ${String(p.calorieGoal).trim()}`);
    if (p.proteinGoal != null && String(p.proteinGoal).trim()) profileParts.push(`Daily protein goal (g): ${String(p.proteinGoal).trim()}`);
    if (p.medicalConditions && String(p.medicalConditions).trim()) profileParts.push(`Medical conditions / notes: ${String(p.medicalConditions).trim()}`);
  }
  const profileText = profileParts.length > 0 ? `Profile:\n${profileParts.join("\n")}` : "";

  const userContent = profileText
    ? `Date: ${dateStr || "Today"}\n\n${profileText}\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n\nWrite the 2–3 sentence daily summary now. Use profile context (e.g. goals, name) when relevant.`
    : `Date: ${dateStr || "Today"}\n\nEvents:\n${eventsText}\n\nJournal:\n${journalText}\n\n${moodText}\n\nWrite the 2–3 sentence daily summary now.`;

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

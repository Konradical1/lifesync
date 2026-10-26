import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { AI } from "./config";
import { getAuthHeaders } from "./supabase";
const { foodFields } = require("../utils/nutrition");

const EXTRACT_TIMEOUT_MS = 8000;
const PHOTO_MAX_WIDTH = 1024;

/**
 * Downscale a picked photo to a small JPEG (base64) so upload + model time
 * stay short and it can sit in the offline queue.
 * @param {string} uri - local image uri from the camera or photo library
 * @returns {Promise<string>} base64 JPEG
 */
export async function prepareFoodPhoto(uri) {
  const rendered = await ImageManipulator.manipulate(uri)
    .resize({ width: PHOTO_MAX_WIDTH })
    .renderAsync();
  const { base64 } = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });
  return base64;
}

// Longer than the API's 30 s maxDuration (vercel.json), so the server answers
// first and a timeout here means the connection stalled, not the AI.
const FOOD_TIMEOUT_MS = 40000;
const IDEA_TIMEOUT_MS = 20000;

/**
 * Estimate a meal with the food AI: a photo, a typed meal, or a correction of
 * an earlier estimate ({ previous, note }). Resolves to food event fields.
 *
 * @param {{ image?: string, text?: string, note?: string, goal?: 'gain'|'maintain'|'lose', previous?: { name: string, portion: string, items: Array<{ name: string, portion: string, calories: number }> } }} input
 * @returns {Promise<{ ok: true, data: { description: string, note?: string, calories: number, protein: number, carbs: number, fat: number, nutrition: object } } | { ok: false, error: string, offline?: boolean }>}
 *   offline: the request never got an answer (no connection / timeout) — safe to retry later.
 */
export async function analyzeFood(input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FOOD_TIMEOUT_MS);
  try {
    const res = await fetch(AI.foodPhoto, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    // Any answer, even a platform error page, is an error with Retry, never
    // offline: the queue auto-retries offline items and every try uses quota.
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return { ok: false, error: typeof json?.error === "string" ? json.error : "AI is unavailable, try again later" };
    }
    if (!json.data || json.data.is_food === false) {
      return { ok: false, error: "Couldn't find any food there. Try a closer photo or describe it." };
    }
    return { ok: true, data: foodFields(json.data) };
  } catch (err) {
    return {
      ok: false,
      offline: true,
      error: err?.name === "AbortError" ? "Took too long. Check your connection." : err?.message || "Network error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One short "what to eat next" idea for today from the food coach.
 * @param {{ goal: string, targets: object, totals: object, meals: Array<{ name: string, calories: number, protein: number, health_score: number|null }>, localTime: string }} payload
 * @returns {Promise<{ ok: boolean, idea?: string, error?: string }>}
 */
export async function getFoodIdea(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IDEA_TIMEOUT_MS);
  try {
    const res = await fetch(AI.foodCoach, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    // An empty idea counts as a failure so the card hides the row instead of caching a blank.
    const idea = typeof json?.idea === "string" ? json.idea.trim() : "";
    return idea ? { ok: true, idea } : { ok: false, error: "Invalid response shape" };
  } catch (err) {
    return { ok: false, error: err?.message || "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}

function num(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/**
 * Call the backend to extract exercise description, duration, and calories from free text.
 * @param {string} text - User input, e.g. "30 min run"
 * @returns {Promise<{ ok: boolean, data?: { description?, duration, calories }, error?: string }>}
 */
export async function extractExercise(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return { ok: false, error: "Empty text" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const res = await fetch(AI.extract, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ type: "exercise", text: trimmed }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    if (json.ok && json.data) {
      return { ok: true, data: normalizeExerciseData(json.data) };
    }
    if (json.raw) {
      try {
        const parsed = JSON.parse(json.raw);
        return { ok: true, data: normalizeExerciseData(parsed) };
      } catch {
        return { ok: false, error: "Invalid AI response" };
      }
    }
    return { ok: false, error: "Invalid response shape" };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || "Network error" };
  }
}

function normalizeExerciseData(data) {
  if (!data || typeof data !== "object") return {};
  return {
    description: typeof data.description === "string" ? data.description.trim() : undefined,
    duration: num(data.duration),
    calories: num(data.calories),
  };
}

const SUMMARY_TIMEOUT_MS = 12000;

/**
 * Get AI-generated day summary from events, journal, mood for a date (longer 2–3 sentences).
 * @param {{ date: string, events: array, journal: array, mood: object }} payload
 * @returns {Promise<{ ok: boolean, summary?: string, error?: string }>}
 */
export async function getDaySummary(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const res = await fetch(AI.summary, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    return { ok: true, summary: json?.summary ?? "" };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Get a very short one-sentence AI day summary for the home screen (with time-based greeting and one highlighted word).
 * @param {{ date: string, events: array, journal: array, mood: object, profile?: object }} payload
 * @returns {Promise<{ ok: boolean, summary?: string, highlightedWord?: string, error?: string }>}
 */
export async function getDaySummaryShort(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const res = await fetch(AI.summaryShort, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    return {
      ok: true,
      summary: json?.summary ?? "",
      highlightedWord: json?.highlight ? String(json.highlight).trim() : undefined,
    };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Get AI-generated insights from recent events, journal entries, moods, and profile context.
 * @param {{ events: array, journal: array, moods: array, today?: string, profile?: object }} payload
 * @returns {Promise<{ ok: boolean, insights?: string, error?: string }>}
 */
export async function getInsights(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const res = await fetch(AI.insights, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    return { ok: true, insights: json?.insights ?? "" };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || "Network error" };
  }
}

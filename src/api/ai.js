import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { AI } from "./config";
import { getAuthHeaders } from "./supabase";

const EXTRACT_TIMEOUT_MS = 8000;

/**
 * Call the backend to extract food description + macros (calories, protein, carbs, fat) from free text.
 * Used for the food calorie/macro AI flow.
 *
 * @param {string} text - User input, e.g. "Oatmeal with banana and honey"
 * @returns {Promise<{ ok: boolean, data?: { description?, calories, protein, carbs, fat }, raw?: string, error?: string }>}
 */
export async function extractFood(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "Empty text" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const res = await fetch(AI.extract, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ type: "food", text: trimmed }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || res.statusText || "Request failed",
      };
    }

    if (json.ok && json.data) {
      return {
        ok: true,
        data: normalizeFoodData(json.data),
      };
    }
    if (json.raw) {
      try {
        const parsed = JSON.parse(json.raw);
        return { ok: true, data: normalizeFoodData(parsed) };
      } catch {
        return { ok: false, error: "Invalid AI response" };
      }
    }
    return { ok: false, error: "Invalid response shape" };
  } catch (err) {
    clearTimeout(timeout);
    const message = err?.message || "Network error";
    return { ok: false, offline: true, error: message };
  }
}

const PHOTO_TIMEOUT_MS = 30000;
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

/**
 * Send a food photo to the backend (Claude vision): reads nutrition labels,
 * recognizes products, estimates portion size.
 *
 * @param {string} image - base64 JPEG from prepareFoodPhoto
 * @param {string} [note] - optional hint, e.g. "ate half"
 * @returns {Promise<{ ok: boolean, data?: { description, portion, source, items, calories, protein, carbs, fat }, error?: string, offline?: boolean }>}
 *   offline: the request never got an answer (no connection / timeout) — safe to retry later.
 */
export async function analyzeFoodPhoto(image, note) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    const res = await fetch(AI.foodPhoto, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ image, note }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    const d = json?.data;
    if (!d || d.is_food === false) {
      return { ok: false, error: "No food found in that photo. Try again closer up." };
    }
    return {
      ok: true,
      data: {
        ...normalizeFoodData({ ...d, description: d.name }),
        portion: typeof d.portion === "string" ? d.portion : "",
        source: d.source,
        items: Array.isArray(d.items) ? d.items : [],
      },
    };
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

function normalizeFoodData(data) {
  if (!data || typeof data !== "object") return {};
  return {
    description:
      typeof data.description === "string" ? data.description.trim() : undefined,
    calories: num(data.calories),
    protein: num(data.protein),
    carbs: num(data.carbs),
    fat: num(data.fat),
  };
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

import { AI } from "./config";

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
      headers: { "Content-Type": "application/json" },
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
    return { ok: false, error: message };
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

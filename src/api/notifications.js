import { NOTIFICATIONS } from "./config";

const TIMEOUT_MS = 8000;

/**
 * Register an Expo push token with the backend.
 * @param {{ userId: string, token: string, timezone: string }} params
 */
export async function registerPushToken({ userId, token, timezone }) {
  if (!userId || !token) return { ok: false, error: "Missing userId or token" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(NOTIFICATIONS.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token, timezone }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error || res.statusText || "Request failed" };
    }
    return { ok: true };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || "Network error" };
  }
}

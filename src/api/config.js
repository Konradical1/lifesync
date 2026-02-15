/**
 * Backend API base URL for AI (and future) endpoints.
 *
 * Set this to your deployed Vercel app URL, e.g. https://journalx2.vercel.app
 * For local dev, use your Vercel preview URL or run `vercel dev` and use that URL.
 *
 * Optional: set EXPO_PUBLIC_API_URL in .env or app config to override.
 */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL)?.replace?.(/\/$/, "") ||
  "https://your-api.vercel.app";

export const AI = {
  extract: `${API_BASE_URL}/api/ai/extract`,
};

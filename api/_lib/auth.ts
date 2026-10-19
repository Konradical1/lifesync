/**
 * Shared auth for API routes. Verifies the Supabase JWT the app sends in
 * the Authorization header and applies a light per-user rate limit.
 * Files under api/_lib are not exposed as Vercel routes.
 */
import type { VercelRequest, VercelResponse } from "vercel";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
// Per-instance memory; resets on cold start. Enough to blunt abuse of the
// paid AI endpoints without a datastore.
const requestLog = new Map<string, number[]>();

/** Per-user daily cap, counted in app_metadata[`${key}_quota`] = { day, n }. */
type DailyLimit = { key: string; max: number };

/**
 * Returns the authenticated user's id, or null after writing an error
 * response. Callers must `return` when null is returned.
 */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
  daily?: DailyLimit
): Promise<string | null> {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    res.status(500).json({ error: "Server misconfiguration" });
    return null;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const now = Date.now();
  const recent = (requestLog.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({ error: "Too many requests" });
    return null;
  }
  recent.push(now);
  requestLog.set(userId, recent);

  if (daily) {
    const field = `${daily.key}_quota`;
    const today = new Date().toISOString().slice(0, 10); // resets at midnight UTC
    const prev = data.user.app_metadata?.[field];
    const used = prev?.day === today ? Number(prev.n) || 0 : 0;
    if (used >= daily.max) {
      res.status(429).json({
        error: `That's all ${daily.max} scans for today. Type it in instead, or snap again tomorrow.`,
      });
      return null;
    }
    // ponytail: read-then-write, so parallel requests can slip one or two past the cap. Fine for cost control.
    const { error: quotaError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { [field]: { day: today, n: used + 1 } },
    });
    if (quotaError) console.error("Daily quota update failed:", quotaError.message);
  }

  return userId;
}

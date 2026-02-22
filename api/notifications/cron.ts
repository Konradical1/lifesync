/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ─── Message Variants ────────────────────────────────────────────────

const MEAL_MESSAGES = [
  '🍽️ "Did you eat today? Logging meals helps spot patterns."',
  '🥗 "Quick check — want to log what you ate today?"',
  '🍕 "Even a small meal counts. Want to log it?"',
  '🧠 "Food fuels focus — log your meals when you can."',
];

const JOURNAL_MESSAGES = [
  '📝 "Take 2 minutes to reflect on your day."',
  '🌙 "How did today really feel?"',
  '💭 "One thought. One sentence. That\'s enough."',
  '🧠 "Writing it down can help clear your head."',
];

const WATER_GENERAL_MESSAGES = [
  '💧 "Quick water check."',
  '🚰 "Have you had any water recently?"',
  '🌊 "Your body might want a sip."',
  '💦 "Hydration check-in."',
];

const WATER_SMART_MESSAGES = [
  '💧 "A little water might boost your energy right now."',
  '⚡ "Feeling sluggish? Water can help."',
  '🌤️ "Midday check — hydration helps more than you think."',
  '🚰 "A glass of water could change the rest of your afternoon."',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Timezone helpers ────────────────────────────────────────────────

function getLocalDate(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const y = parts.find(p => p.type === "year")!.value;
    const m = parts.find(p => p.type === "month")!.value;
    const d = parts.find(p => p.type === "day")!.value;
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getLocalHour(tz: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date());
    return parseInt(h, 10);
  } catch {
    return new Date().getUTCHours();
  }
}

// ─── Types ───────────────────────────────────────────────────────────

interface TokenRow {
  user_id: string;
  token: string;
  timezone: string;
}

type NotificationType = "meal_reminder" | "journal_reminder" | "water_general" | "water_smart";

// ─── Notification guard ──────────────────────────────────────────────

async function wasAlreadySent(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  today: string,
  minHoursAgo?: number
): Promise<boolean> {
  let query = supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("notification_type", type);

  if (minHoursAgo) {
    const since = new Date(Date.now() - minHoursAgo * 60 * 60 * 1000).toISOString();
    query = query.gte("sent_at", since);
  } else {
    query = query.gte("sent_at", `${today}T00:00:00`);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

async function logNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  message: string
) {
  await supabase.from("notification_log").insert({
    user_id: userId,
    notification_type: type,
    message,
  });
}

// ─── Send push ───────────────────────────────────────────────────────

async function sendPush(token: string, title: string, body: string): Promise<boolean> {
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
    const data = await resp.json();
    return data?.data?.status === "ok";
  } catch {
    return false;
  }
}

// ─── Per-user check logic ────────────────────────────────────────────

async function checkAndNotify(supabase: SupabaseClient, row: TokenRow) {
  const { user_id, token, timezone } = row;
  const today = getLocalDate(timezone);
  const hour = getLocalHour(timezone);

  // 1️⃣  Meal reminder (7–9pm, no food logged today)
  if (hour >= 19 && hour <= 21) {
    if (!(await wasAlreadySent(supabase, user_id, "meal_reminder", today))) {
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("type", "food")
        .eq("date", today);

      if ((count ?? 0) === 0) {
        const msg = pick(MEAL_MESSAGES);
        const sent = await sendPush(token, "JournalX", msg);
        if (sent) await logNotification(supabase, user_id, "meal_reminder", msg);
      }
    }
  }

  // 2️⃣  Journal reminder (8pm, no journal entry today)
  if (hour === 20) {
    if (!(await wasAlreadySent(supabase, user_id, "journal_reminder", today))) {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("date", today);

      if ((count ?? 0) === 0) {
        const msg = pick(JOURNAL_MESSAGES);
        const sent = await sendPush(token, "JournalX", msg);
        if (sent) await logNotification(supabase, user_id, "journal_reminder", msg);
      }
    }
  }

  // Fetch water data once for both water checks
  const needsWaterCheck = (hour >= 10 && hour <= 21) || (hour >= 14 && hour <= 16);
  let waterOzToday = 0;
  let waterGoalOz = 64; // default 64 oz

  if (needsWaterCheck) {
    const [waterRes, profileRes] = await Promise.all([
      supabase.from("water").select("oz").eq("user_id", user_id).eq("date", today),
      supabase.from("profile").select("water_goal_oz").eq("user_id", user_id).maybeSingle(),
    ]);

    waterOzToday = (waterRes.data ?? []).reduce((s: number, w: { oz: number }) => s + (w.oz ?? 0), 0);
    waterGoalOz = profileRes.data?.water_goal_oz ?? 64;
  }

  // 3️⃣  General water reminder (below goal, not more than every 2 hours)
  if (hour >= 10 && hour <= 21 && waterOzToday < waterGoalOz) {
    if (!(await wasAlreadySent(supabase, user_id, "water_general", today, 2))) {
      const msg = pick(WATER_GENERAL_MESSAGES);
      const sent = await sendPush(token, "JournalX", msg);
      if (sent) await logNotification(supabase, user_id, "water_general", msg);
    }
  }

  // 4️⃣  Smart water reminder (2–4pm, <40% of goal, once per day)
  if (hour >= 14 && hour <= 16) {
    if (!(await wasAlreadySent(supabase, user_id, "water_smart", today))) {
      if (waterGoalOz > 0 && waterOzToday < waterGoalOz * 0.4) {
        const msg = pick(WATER_SMART_MESSAGES);
        const sent = await sendPush(token, "JournalX", msg);
        if (sent) await logNotification(supabase, user_id, "water_smart", msg);
      }
    }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Accept GET (Vercel Cron) and POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify cron secret when called via GET (Vercel Cron sets this header)
  if (req.method === "GET" && CRON_SECRET) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("user_id, token, timezone");

    if (error) {
      console.error("Failed to load push tokens:", error);
      return res.status(500).json({ error: "Failed to load tokens" });
    }

    if (!tokens || tokens.length === 0) {
      return res.json({ ok: true, processed: 0 });
    }

    // Deduplicate — one check per user (use first token per user)
    const byUser = new Map<string, TokenRow>();
    for (const t of tokens as TokenRow[]) {
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, t);
    }

    let processed = 0;
    const errors: string[] = [];

    for (const row of byUser.values()) {
      try {
        await checkAndNotify(supabase, row);
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${row.user_id}: ${msg}`);
      }
    }

    return res.json({ ok: true, processed, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(500).json({ error: message });
  }
}

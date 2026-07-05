/** DEPLOY: After editing this file (or any under api/), push to git so Vercel updates the API. */
import type { VercelRequest, VercelResponse } from "vercel";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "../_lib/auth";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  // Derive the user from the verified JWT — never trust a client-supplied id.
  const userId = await requireUser(req, res);
  if (!userId) return;

  const { token, timezone } = req.body ?? {};

  if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "Invalid push token" });
  }

  const tz = typeof timezone === "string" && timezone.length > 0 ? timezone : "America/New_York";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { error } = await supabase.from("push_tokens").upsert(
      { user_id: userId, token, timezone: tz, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );

    if (error) {
      console.error("Push token upsert failed:", error);
      return res.status(500).json({ error: "Failed to save token" });
    }

    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return res.status(500).json({ error: message });
  }
}

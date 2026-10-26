/**
 * OpenRouter call shared by the food endpoints: one chat completion with
 * strict JSON-schema output, Gemini first and an automatic fallback model.
 * Files under api/_lib are not exposed as Vercel routes.
 */
import type { VercelResponse } from "vercel";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = [
  process.env.FOOD_MODEL || "google/gemini-3.8-flash",
  process.env.FOOD_FALLBACK_MODEL || "openai/gpt-6-sol",
];

/** A failed AI call; `status` is the HTTP status the endpoint should answer with. */
export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Message = { role: "system" | "user"; content: string | Array<Record<string, unknown>> };

export async function openRouterJson<T>(opts: {
  name: string;
  schema: object;
  messages: Message[];
  maxTokens: number;
  timeoutMs: number;
}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set");
    throw new AiError(500, "Server misconfiguration");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  let response: Response;
  let body: string;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        models: MODELS,
        messages: opts.messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: opts.schema },
        },
        reasoning: { effort: "low" },
        max_tokens: opts.maxTokens,
        provider: { require_parameters: true },
      }),
      signal: controller.signal,
    });
    body = await response.text();
  } catch {
    throw new AiError(504, "AI took too long, try again");
  } finally {
    clearTimeout(timeout);
  }

  let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  try {
    data = JSON.parse(body);
  } catch {
    data = null;
  }
  if (response.status === 429) throw new AiError(429, "AI is busy, try again in a moment");
  if (!response.ok) {
    // 402 (out of credits), 5xx and anything else upstream: not the user's fault.
    console.error("OpenRouter error", response.status, data?.error?.message);
    throw new AiError(503, "AI is unavailable, try again later");
  }
  try {
    return JSON.parse(data?.choices?.[0]?.message?.content ?? "") as T;
  } catch {
    throw new AiError(502, "Couldn't read the AI response");
  }
}

/** Answer with the error's status and message. */
export function sendAiError(res: VercelResponse, err: unknown) {
  if (err instanceof AiError) return res.status(err.status).json({ error: err.message });
  console.error("Food AI failed", err);
  return res.status(500).json({ error: "Request failed" });
}

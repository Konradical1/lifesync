/** Type declarations for Vercel serverless API routes (avoids requiring the "vercel" module at type-check time). */
declare module "vercel" {
  import type { IncomingMessage } from "http";
  import type { ServerResponse } from "http";

  export interface VercelRequest extends IncomingMessage {
    body?: unknown;
    query?: Record<string, string | string[]>;
  }

  export interface VercelResponse extends ServerResponse {
    status(code: number): this;
    json(body: unknown): this;
  }
}

// API route helpers: errors, IP extraction, admin guard.

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, type AdminSession } from "./auth";
import { rateLimit } from "./ratelimit";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const session = await getAdminSession();
  if (!session) return { response: jsonError(401, "Authentication required") };
  return { session };
}

/** Simple guarded rate limit for sensitive endpoints. */
export function guardRate(req: NextRequest, scope: string, max: number, windowMs: number): NextResponse | null {
  const ip = getClientIp(req);
  if (!rateLimit(`${scope}:${ip}`, max, windowMs)) {
    return jsonError(429, "Too many requests. Please try again shortly.");
  }
  return null;
}

export function handleUnknownError(error: unknown, context: string): NextResponse {
  console.error(`[zaura:${context}]`, error);
  return jsonError(500, "Something went wrong. Please try again.");
}

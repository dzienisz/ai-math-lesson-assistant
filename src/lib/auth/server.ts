import { createNeonAuth } from "@neondatabase/auth/next/server";
import { NextResponse } from "next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let _auth: NeonAuth | null = null;

function getAuth(): NeonAuth | null {
  if (_auth) return _auth;

  const baseUrl = process.env.ALEMATMA_NEON_AUTH_BASE_URL;
  const secret = process.env.ALEMATMA_NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !secret) return null;

  _auth = createNeonAuth({ baseUrl, cookies: { secret } });
  return _auth;
}

// Exported helper: get Neon Auth or throw (for use in API routes at runtime)
export function requireAuth(): NeonAuth {
  const instance = getAuth();
  if (!instance) {
    throw new Error("ALEMATMA_NEON_AUTH_BASE_URL and ALEMATMA_NEON_AUTH_COOKIE_SECRET must be set");
  }
  return instance;
}

// Auth handler for the catch-all API route — safe at module scope
const stubResponse = async () => new Response("Auth not configured", { status: 503 });
const instance = getAuth();
export const authHandler = instance
  ? instance.handler()
  : { GET: stubResponse, POST: stubResponse };

// Auth middleware for proxy — safe at module scope
export const authMiddleware = instance
  ? instance.middleware({ loginUrl: "/login" })
  : () => NextResponse.next();

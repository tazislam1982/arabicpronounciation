import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const AUTH_REGION = process.env.AZURE_SPEECH_REGION!;
const SUB_KEY = process.env.AZURE_SPEECH_KEY!;
// Comma-separated list of allowed origins, e.g.
// ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

let cachedToken: { token: string; exp: number } | null = null;

function hostOf(u: string | null): string | null {
  if (!u) return null;
  try { return new URL(u).host; } catch { return null; }
}

function isAllowed(req: NextRequest): { ok: boolean; allowOrigin?: string } {
  // If no list configured, allow same-host by default (dev-friendly)
  const origin = req.headers.get("origin");      // may be null on direct nav
  const referer = req.headers.get("referer");    // may help when origin is null
  const host    = req.headers.get("host");       // e.g. "localhost:3000"

  const allowedHosts = new Set(
    ALLOWED_ORIGINS.map(o => hostOf(o)).filter(Boolean) as string[]
  );

  // Allow when no list set: same host only
  if (allowedHosts.size === 0) {
    return { ok: true, allowOrigin: origin ?? undefined };
  }

  const oHost = hostOf(origin);
  const rHost = hostOf(referer);

  // 1) Same-origin fetch: check Origin header
  if (oHost && allowedHosts.has(oHost)) {
    return { ok: true, allowOrigin: origin ?? undefined };
  }

  // 2) Direct navigation: no Origin, but Host matches
  if (host && allowedHosts.has(host)) {
    // allow; no CORS header needed for direct browser load
    return { ok: true, allowOrigin: undefined };
  }

  // 3) Fallback to Referer
  if (rHost && allowedHosts.has(rHost)) {
    return { ok: true, allowOrigin: origin ?? undefined };
  }

  return { ok: false };
}

async function fetchAzureToken(): Promise<string> {
  const url = `https://${AUTH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": SUB_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Azure token fetch failed: ${res.status} ${txt}`);
  }
  return res.text();
}

export async function GET(req: NextRequest) {
  // Origin / same-host guard
  const guard = isAllowed(req);
  if (!guard.ok) return new Response("Forbidden", { status: 403 });

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.exp > nowSec + 15) {
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (guard.allowOrigin) headers["Access-Control-Allow-Origin"] = guard.allowOrigin;
      return new Response(
        JSON.stringify({ token: cachedToken.token, region: AUTH_REGION }),
        { status: 200, headers }
      );
    }

    const token = await fetchAzureToken();
    cachedToken = { token, exp: nowSec + 9 * 60 };

    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (guard.allowOrigin) headers["Access-Control-Allow-Origin"] = guard.allowOrigin;
    return new Response(JSON.stringify({ token, region: AUTH_REGION }), { status: 200, headers });
  } catch (e: any) {
    return new Response(e?.message || "Token error", { status: 500 });
  }
}

// Optional: handle preflight if you ever switch to POST or custom headers
export async function OPTIONS(req: NextRequest) {
  const guard = isAllowed(req);
  if (!guard.ok) return new Response("Forbidden", { status: 403 });
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
  };
  if (guard.allowOrigin) headers["Access-Control-Allow-Origin"] = guard.allowOrigin;
  return new Response(null, { status: 204, headers });
}

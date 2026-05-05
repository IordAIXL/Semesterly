import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

type RateLimitStore = Map<string, Bucket>;

declare global {
  // eslint-disable-next-line no-var
  var semesterlyRateLimitStore: RateLimitStore | undefined;
}

function store() {
  globalThis.semesterlyRateLimitStore ??= new Map<string, Bucket>();
  return globalThis.semesterlyRateLimitStore;
}

function requestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request: NextRequest, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const id = `${key}:${requestIp(request)}`;
  const bucket = store().get(id);

  if (!bucket || bucket.resetAt <= now) {
    store().set(id, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many attempts. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

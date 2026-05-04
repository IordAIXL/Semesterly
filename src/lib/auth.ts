import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export type AuthUser = { userId: string; role?: "USER" | "ADMIN" };

type SessionPayload = {
  sub?: string;
  role?: "USER" | "ADMIN";
  exp?: number;
};

export const SESSION_COOKIE = "semesterly_session";
const TOKEN_PREFIX = "semesterly";

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function getSessionSecret() {
  return process.env.SESSION_SECRET;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function demoAuthEnabled() {
  if (process.env.DEMO_AUTH_ENABLED === "false") return false;
  if (process.env.NODE_ENV === "production") return process.env.DEMO_AUTH_ENABLED === "true";
  return true;
}

export function createSessionToken(user: AuthUser, ttlSeconds = 60 * 60 * 8) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is required to create session tokens");

  const payload: SessionPayload = {
    sub: user.userId,
    role: user.role ?? "USER",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${TOKEN_PREFIX}.${encoded}.${signature}`;
}

export function getSessionAuth(request: NextRequest): AuthUser | null {
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const token = bearerToken || cookieToken;
  if (!token) return null;

  const [prefix, encoded, signature] = token.split(".");
  const secret = getSessionSecret();
  if (prefix !== TOKEN_PREFIX || !encoded || !signature || !secret) return null;

  const expected = sign(encoded, secret);
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.sub, role: payload.role ?? "USER" };
  } catch {
    return null;
  }
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function hasBearerAuth(request: NextRequest) {
  return (request.headers.get("authorization") ?? "").startsWith("Bearer ");
}

function rejectCrossSiteCookieMutation(request: NextRequest): NextResponse | null {
  if (!isUnsafeMethod(request.method)) return null;
  if (!request.cookies.get(SESSION_COOKIE)?.value || hasBearerAuth(request)) return null;

  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  const referer = request.headers.get("referer");
  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== expectedOrigin) {
        return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  }

  return null;
}

export function getRequestUser(request: NextRequest): AuthUser | null {
  const session = getSessionAuth(request);
  if (session) return session;

  const demoUserId = request.headers.get("x-user-id");
  if (demoUserId && demoAuthEnabled()) return { userId: demoUserId, role: demoUserId === "dom-admin" ? "ADMIN" : "USER" };

  return null;
}

export function requireUser(request: NextRequest): AuthUser | NextResponse {
  const crossSite = rejectCrossSiteCookieMutation(request);
  if (crossSite) return crossSite;

  const user = getRequestUser(request);
  if (!user) return NextResponse.json({ error: "User session required" }, { status: 401 });
  return user;
}

export function isAuthResponse(value: AuthUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function setSessionCookie(response: NextResponse, token: string, maxAgeSeconds = 60 * 60 * 8) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function requireAdmin(request: NextRequest): AuthUser | NextResponse {
  const crossSite = rejectCrossSiteCookieMutation(request);
  if (crossSite) return crossSite;

  const session = getSessionAuth(request);
  if (session?.role === "ADMIN") return session;

  const token = process.env.ADMIN_TOKEN;
  if (token) {
    const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
    const header = request.headers.get("x-admin-token");
    if (bearer === token || header === token) return { userId: "admin", role: "ADMIN" };
  }

  return NextResponse.json({ error: "Admin access required" }, { status: 401 });
}

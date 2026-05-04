import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true, role: true },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const rememberedSessionSeconds = 60 * 60 * 24 * 30;
  const token = createSessionToken({ userId: user.id, role: user.role }, rememberedSessionSeconds);
  const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  setSessionCookie(response, token, rememberedSessionSeconds);
  return response;
}

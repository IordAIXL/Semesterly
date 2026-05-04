import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string; school?: string; year?: string; major?: string } | null;
  const name = body?.name?.trim() ?? "";
  const email = normalizeEmail(body?.email);
  const password = body?.password ?? "";

  if (name.length < 2) return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  if (!email.includes("@") || email.length < 5) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account already exists for that email" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      school: body?.school?.trim() || null,
      year: body?.year?.trim() || null,
      major: body?.major?.trim() || null,
      timezone: "America/Chicago",
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const token = createSessionToken({ userId: user.id, role: user.role }, 60 * 60 * 8);
  const response = NextResponse.json({ ok: true, user }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}

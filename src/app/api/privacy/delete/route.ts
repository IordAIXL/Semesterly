import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, requireUser, isAuthResponse } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const confirmation = request.headers.get("x-confirm-delete");

  if (confirmation !== "DELETE-MY-DATA") return NextResponse.json({ error: "Delete confirmation required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (existing.role === "ADMIN") return NextResponse.json({ error: "Admin account cannot be deleted here" }, { status: 403 });

  await prisma.user.delete({ where: { id: userId } });
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

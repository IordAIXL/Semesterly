import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, demoAuthEnabled, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  if (!demoAuthEnabled()) return NextResponse.json({ error: "Demo auth is disabled" }, { status: 403 });

  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "User id required" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "ADMIN" && request.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Admin demo sessions require admin token" }, { status: 403 });
  }

  try {
    const token = createSessionToken({ userId: user.id, role: user.role }, 60 * 60 * 8);
    const response = NextResponse.json({ token, tokenType: "Bearer", expiresIn: 60 * 60 * 8, user: { id: user.id, role: user.role } });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "SESSION_SECRET is required for session tokens" }, { status: 500 });
  }
}

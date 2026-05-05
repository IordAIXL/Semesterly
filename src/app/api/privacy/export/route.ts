import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      timezone: true,
      school: true,
      year: true,
      major: true,
      scheduleCategories: true,
      preferences: true,
      createdAt: true,
      terms: true,
      courses: { include: { meetings: true } },
      tasks: { orderBy: { dueAt: "asc" } },
      events: { orderBy: { startsAt: "asc" } },
      importBatches: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    note: "Password hashes and session secrets are intentionally excluded.",
    user,
  }, { headers: { "Cache-Control": "no-store" } });
}

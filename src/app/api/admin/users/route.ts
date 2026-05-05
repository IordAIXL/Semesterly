import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAuthResponse } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (isAuthResponse(auth)) return auth;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
      courses: { include: { meetings: true } },
      tasks: { orderBy: { dueAt: "asc" } },
      events: { orderBy: { startsAt: "asc" } },
    },
  });

  await prisma.adminAuditLog.create({
    data: { action: "VIEW_ALL_USERS", actor: auth.userId, metadata: JSON.stringify({ count: users.length }) },
  });

  return jsonNoStore({ users });
}

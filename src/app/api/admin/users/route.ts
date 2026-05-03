import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (isAuthResponse(auth)) return auth;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      courses: { include: { meetings: true } },
      tasks: { orderBy: { dueAt: "asc" } },
      events: { orderBy: { startsAt: "asc" } },
    },
  });

  await prisma.adminAuditLog.create({
    data: { action: "VIEW_ALL_USERS", actor: auth.userId, metadata: JSON.stringify({ count: users.length }) },
  });

  return NextResponse.json({ users });
}

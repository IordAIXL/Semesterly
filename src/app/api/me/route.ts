import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      courses: { include: { meetings: true } },
      tasks: { orderBy: { dueAt: "asc" } },
      events: { orderBy: { startsAt: "asc" } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

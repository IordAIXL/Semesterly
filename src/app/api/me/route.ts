import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

const userInclude = {
  courses: { include: { meetings: true } },
  tasks: { orderBy: { dueAt: "asc" } },
  events: { orderBy: { startsAt: "asc" } },
} as const;

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => ({})) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: "Name must be 1-80 characters" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    include: userInclude,
  });

  return NextResponse.json({ user });
}

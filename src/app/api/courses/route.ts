import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const courses = await prisma.course.findMany({ where: { userId }, orderBy: { code: "asc" }, include: { meetings: true } });
  return NextResponse.json({ courses });
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const body = await request.json().catch(() => null) as { code?: string; name?: string; color?: string; importance?: number; location?: string } | null;
  if (!body?.code || !body.name) return NextResponse.json({ error: "Code and name required" }, { status: 400 });
  const course = await prisma.course.create({
    data: {
      userId,
      code: body.code.toUpperCase(),
      name: body.name,
      color: body.color ?? "#1a73e8",
      importance: body.importance ?? 3,
      location: body.location,
    },
  });
  return NextResponse.json({ course }, { status: 201 });
}

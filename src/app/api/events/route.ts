import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const events = await prisma.event.findMany({ where: { userId }, orderBy: { startsAt: "asc" } });
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const body = await request.json().catch(() => null) as { title?: string; startsAt?: string; endsAt?: string; category?: "CLASS" | "STUDY" | "PERSONAL" | "WORK" | "CLUB" | "OTHER"; location?: string; courseId?: string } | null;
  if (!body?.title || !body.startsAt || !body.endsAt) return NextResponse.json({ error: "Title, start, and end required" }, { status: 400 });
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  if (endsAt <= startsAt) return NextResponse.json({ error: "Event end must be after start" }, { status: 400 });
  if (body.courseId) {
    const course = await prisma.course.findFirst({ where: { id: body.courseId, userId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const event = await prisma.event.create({
    include: { course: true },
    data: {
      userId,
      courseId: body.courseId || undefined,
      title: body.title,
      startsAt,
      endsAt,
      category: body.category ?? "OTHER",
      location: body.location,
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}

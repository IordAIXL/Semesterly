import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api-response";

const legacyCategories = new Set(["CLASS", "STUDY", "PERSONAL", "WORK", "CLUB", "OTHER"]);

async function listEvents(userId: string) {
  return prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    courseId: string | null;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    category: string;
    source: string;
  }>>`SELECT id, "userId", "courseId", title, "startsAt", "endsAt", location, category::text AS category, source FROM "Event" WHERE "userId" = ${userId} ORDER BY "startsAt" ASC`;
}

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const events = await listEvents(userId);
  return jsonNoStore({ events });
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const body = await request.json().catch(() => null) as { title?: string; startsAt?: string; endsAt?: string; category?: string; location?: string; courseId?: string } | null;
  if (!body?.title || !body.startsAt || !body.endsAt) return NextResponse.json({ error: "Title, start, and end required" }, { status: 400 });
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  if (endsAt <= startsAt) return NextResponse.json({ error: "Event end must be after start" }, { status: 400 });
  if (body.courseId) {
    const course = await prisma.course.findFirst({ where: { id: body.courseId, userId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const requestedCategory = body.category?.trim() || "OTHER";
  const data = {
    userId,
    courseId: body.courseId || undefined,
    title: body.title,
    startsAt,
    endsAt,
    category: requestedCategory,
    location: body.location,
  };

  try {
    const event = await prisma.event.create({ include: { course: true }, data });
    return jsonNoStore({ event }, { status: 201 });
  } catch (error) {
    // Production may lag the custom-category migration. Keep event creation working on the legacy enum DB.
    if (legacyCategories.has(requestedCategory)) throw error;
    const event = await prisma.event.create({ include: { course: true }, data: { ...data, category: "OTHER" } });
    return jsonNoStore({ event: { ...event, category: "OTHER" } }, { status: 201 });
  }
}

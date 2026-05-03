import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type EventPatch = {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  category?: "CLASS" | "STUDY" | "PERSONAL" | "WORK" | "CLUB" | "OTHER";
  location?: string | null;
  courseId?: string | null;
};

async function assertCourse(userId: string, courseId?: string | null) {
  if (!courseId) return true;
  const course = await prisma.course.findFirst({ where: { id: courseId, userId } });
  return Boolean(course);
}

export async function PATCH(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as EventPatch | null;
  const existing = await prisma.event.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!(await assertCourse(userId, body?.courseId))) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const startsAt = body?.startsAt ? new Date(body.startsAt) : undefined;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : undefined;
  if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "Event end must be after start" }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: body?.title?.trim() || undefined,
      startsAt,
      endsAt,
      category: body?.category,
      location: body?.location,
      courseId: body?.courseId,
    },
  });

  return NextResponse.json({ event });
}

export async function DELETE(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const { id } = await context.params;
  const existing = await prisma.event.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

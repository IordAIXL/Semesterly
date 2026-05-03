import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const tasks = await prisma.task.findMany({ where: { userId }, orderBy: { dueAt: "asc" }, include: { course: true } });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const body = await request.json().catch(() => null) as { title?: string; courseId?: string; dueAt?: string; estimatedMinutes?: number; importance?: number } | null;
  if (!body?.title || !body.dueAt) return NextResponse.json({ error: "Title and due date required" }, { status: 400 });
  const dueAt = new Date(body.dueAt);
  if (Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
  if (body.courseId) {
    const course = await prisma.course.findFirst({ where: { id: body.courseId, userId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const task = await prisma.task.create({
    data: {
      userId,
      title: body.title,
      courseId: body.courseId || undefined,
      dueAt,
      estimatedMinutes: body.estimatedMinutes ?? 60,
      importance: body.importance ?? 3,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}

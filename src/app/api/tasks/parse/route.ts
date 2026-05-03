import { NextRequest, NextResponse } from "next/server";
import { parseTaskInput } from "@/lib/natural-language";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import type { Course } from "@/lib/types";

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => null) as { input?: string } | null;
  if (!body?.input) return NextResponse.json({ error: "Input required" }, { status: 400 });

  const courses = await prisma.course.findMany({ where: { userId } });
  const mappedCourses = courses.map((course): Course => ({
    id: course.id,
    code: course.code,
    name: course.name,
    color: course.color,
    importance: course.importance,
  }));
  const tasks = body.input
    .split(/\n+/)
    .map((line) => parseTaskInput(line, mappedCourses))
    .filter((task) => Boolean(task));

  if (!tasks.length) return NextResponse.json({ error: "Could not parse task" }, { status: 400 });

  return NextResponse.json({ task: tasks[0], tasks });
}

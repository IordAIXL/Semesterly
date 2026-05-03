import { NextRequest, NextResponse } from "next/server";
import { allSampleStudents } from "@/lib/sample-users";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const CONFIRM_RESET = "RESET-DEMO";

const day = 24 * 60 * 60 * 1000;
function due(offset: number, hour = 17) {
  const date = new Date(Date.now() + offset * day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  if (request.headers.get("x-confirm-reset") !== CONFIRM_RESET) {
    return NextResponse.json({ error: "Reset confirmation required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing?.role === "ADMIN") return NextResponse.json({ error: "Admin accounts cannot be reset through demo reset" }, { status: 403 });

  const sample = allSampleStudents.find((student) => student.id === userId) ?? allSampleStudents[0];
  const courseIdMap = new Map(sample.courses.map((course, index) => [course.id, `${userId}-course-${index}`]));

  await prisma.$transaction(async (tx) => {
    await tx.event.deleteMany({ where: { userId } });
    await tx.task.deleteMany({ where: { userId } });
    const ownedCourses = await tx.course.findMany({ where: { userId }, select: { id: true } });
    await tx.courseMeeting.deleteMany({ where: { courseId: { in: ownedCourses.map((course) => course.id) } } });
    await tx.course.deleteMany({ where: { userId } });
    await tx.term.deleteMany({ where: { userId } });

    await tx.user.upsert({
      where: { id: userId },
      update: { name: sample.name, school: sample.school, year: sample.year, major: sample.major, timezone: "America/Chicago" },
      create: { id: userId, name: sample.name, email: `${userId}@semesterly.local`, passwordHash: hashPassword("semesterly-demo"), school: sample.school, year: sample.year, major: sample.major, timezone: "America/Chicago" },
    });

    for (let index = 0; index < sample.courses.length; index += 1) {
      const course = sample.courses[index];
      await tx.course.create({
        data: {
          id: `${userId}-course-${index}`,
          userId,
          code: course.code,
          name: course.name,
          color: course.color,
          importance: course.importance,
        },
      });
    }

    for (let index = 0; index < sample.tasks.length; index += 1) {
      const task = sample.tasks[index];
      await tx.task.create({
        data: {
          userId,
          courseId: task.courseId ? courseIdMap.get(task.courseId) ?? `${userId}-course-${Math.min(index, sample.courses.length - 1)}` : null,
          title: task.title,
          dueAt: due(index + 1, index === 0 ? 17 : 20),
          estimatedMinutes: task.estimatedMinutes,
          importance: task.importance,
          status: task.status,
        },
      });
    }

    for (let index = 0; index < sample.schedule.length; index += 1) {
      const event = sample.schedule[index];
      const startsAt = due(index + 2, 16 + index);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      await tx.event.create({
        data: {
          userId,
          courseId: event.courseId ? courseIdMap.get(event.courseId) ?? `${userId}-course-${Math.min(index, sample.courses.length - 1)}` : null,
          title: event.title,
          startsAt,
          endsAt,
          location: event.location,
          category: event.category,
          source: "demo-reset",
        },
      });
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { courses: true, tasks: { include: { course: true } }, events: { include: { course: true } } },
  });

  return NextResponse.json({ ok: true, user });
}

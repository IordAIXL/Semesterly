import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

const assignmentTypes = new Set(["ASSIGNMENT", "HOMEWORK", "QUIZ", "EXAM", "PROJECT", "ESSAY", "READING", "LAB", "OTHER"]);
let taskMetadataColumnsReady = false;

async function ensureTaskMetadataColumns() {
  if (taskMetadataColumnsReady) return;
  await prisma.$executeRawUnsafe('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assignmentType" TEXT NOT NULL DEFAULT \'ASSIGNMENT\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "remarks" TEXT');
  taskMetadataColumnsReady = true;
}

export async function PATCH(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  await ensureTaskMetadataColumns();

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { title?: string; assignmentType?: string; remarks?: string | null; courseId?: string | null; dueAt?: string; estimatedMinutes?: number; importance?: number; status?: "NOT_STARTED" | "IN_PROGRESS" | "DONE" } | null;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (body?.courseId) {
    const course = await prisma.course.findFirst({ where: { id: body.courseId, userId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const dueAt = body?.dueAt ? new Date(body.dueAt) : undefined;
  if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Invalid due date" }, { status: 400 });

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: body?.title,
      assignmentType: body?.assignmentType && assignmentTypes.has(body.assignmentType) ? body.assignmentType : undefined,
      remarks: body?.remarks === null ? null : typeof body?.remarks === "string" ? body.remarks.trim().slice(0, 500) || null : undefined,
      courseId: body?.courseId,
      dueAt,
      estimatedMinutes: body?.estimatedMinutes,
      importance: body?.importance,
      status: body?.status,
    },
  });

  return jsonNoStore({ task });
}

export async function DELETE(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  await ensureTaskMetadataColumns();

  const { id } = await context.params;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return jsonNoStore({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

const noStore = { "Cache-Control": "no-store" };

const workspaceSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  timezone: true,
  school: true,
  year: true,
  major: true,
  createdAt: true,
  courses: { include: { meetings: true } },
  tasks: { orderBy: { dueAt: "asc" } },
} as const;

let scheduleCategoriesColumnReady = false;
let preferencesColumnReady = false;
let taskMetadataColumnsReady = false;

async function ensureScheduleCategoriesColumn() {
  if (scheduleCategoriesColumnReady) return;
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "scheduleCategories" TEXT');
  scheduleCategoriesColumnReady = true;
}

async function ensurePreferencesColumn() {
  if (preferencesColumnReady) return;
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferences" TEXT');
  preferencesColumnReady = true;
}

async function ensureTaskMetadataColumns() {
  if (taskMetadataColumnsReady) return;
  await prisma.$executeRawUnsafe('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assignmentType" TEXT NOT NULL DEFAULT \'ASSIGNMENT\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "remarks" TEXT');
  taskMetadataColumnsReady = true;
}

async function getScheduleCategories(userId: string) {
  try {
    await ensureScheduleCategoriesColumn();
    const rows = await prisma.$queryRaw<Array<{ scheduleCategories: string | null }>>`SELECT "scheduleCategories" FROM "User" WHERE id = ${userId} LIMIT 1`;
    return rows[0]?.scheduleCategories ?? null;
  } catch {
    // Sign-in should still work even if the DB temporarily blocks self-healing schema changes.
    return null;
  }
}

async function getPreferences(userId: string) {
  try {
    await ensurePreferencesColumn();
    const rows = await prisma.$queryRaw<Array<{ preferences: string | null }>>`SELECT "preferences" FROM "User" WHERE id = ${userId} LIMIT 1`;
    return rows[0]?.preferences ?? null;
  } catch {
    return null;
  }
}

async function getEvents(userId: string) {
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

async function getWorkspaceUser(userId: string) {
  await ensureTaskMetadataColumns();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: workspaceSelect,
  });
  if (!user) return null;
  const [scheduleCategories, preferences, events] = await Promise.all([getScheduleCategories(userId), getPreferences(userId), getEvents(userId)]);
  return { ...user, scheduleCategories, preferences, events };
}

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const user = await getWorkspaceUser(userId);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user }, { headers: noStore });
}

export async function PATCH(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => ({})) as { name?: unknown; scheduleCategories?: unknown; preferences?: unknown };
  const data: { name?: string } = {};
  let serializedCategories: string | null | undefined;
  let serializedPreferences: string | null | undefined;

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: "Name must be 1-80 characters" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.scheduleCategories !== undefined) {
    if (!Array.isArray(body.scheduleCategories)) return NextResponse.json({ error: "Schedule categories must be an array" }, { status: 400 });
    const categories = body.scheduleCategories
      .filter((item): item is { id?: unknown; label?: unknown; color?: unknown } => typeof item === "object" && item !== null)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id.trim().slice(0, 32) : "",
        label: typeof item.label === "string" ? item.label.trim().slice(0, 40) : "",
        color: typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#1a73e8",
      }))
      .filter((item) => item.id && item.label)
      .slice(0, 20);
    serializedCategories = categories.length ? JSON.stringify(categories) : null;
  }

  if (body.preferences !== undefined) {
    if (typeof body.preferences !== "object" || body.preferences === null || Array.isArray(body.preferences)) {
      return NextResponse.json({ error: "Preferences must be an object" }, { status: 400 });
    }
    const input = body.preferences as { assignmentTrackerEnabled?: unknown; assignmentHighlightColor?: unknown };
    serializedPreferences = JSON.stringify({
      assignmentTrackerEnabled: Boolean(input.assignmentTrackerEnabled),
      assignmentHighlightColor: typeof input.assignmentHighlightColor === "string" && /^#[0-9a-f]{6}$/i.test(input.assignmentHighlightColor) ? input.assignmentHighlightColor : "#ffe45c",
    });
  }

  if (!Object.keys(data).length && serializedCategories === undefined && serializedPreferences === undefined) return NextResponse.json({ error: "No profile changes provided" }, { status: 400 });

  if (Object.keys(data).length) {
    await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true },
    });
  }

  if (serializedCategories !== undefined) {
    try {
      await ensureScheduleCategoriesColumn();
      await prisma.$executeRaw`UPDATE "User" SET "scheduleCategories" = ${serializedCategories} WHERE id = ${userId}`;
    } catch {
      return NextResponse.json({ error: "Could not save schedule categories" }, { status: 500 });
    }
  }

  if (serializedPreferences !== undefined) {
    try {
      await ensurePreferencesColumn();
      await prisma.$executeRaw`UPDATE "User" SET "preferences" = ${serializedPreferences} WHERE id = ${userId}`;
    } catch {
      return NextResponse.json({ error: "Could not save preferences" }, { status: 500 });
    }
  }

  const user = await getWorkspaceUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user }, { headers: noStore });
}

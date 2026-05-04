import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

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
  events: { orderBy: { startsAt: "asc" } },
} as const;

async function getScheduleCategories(userId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ scheduleCategories: string | null }>>`SELECT "scheduleCategories" FROM "User" WHERE id = ${userId} LIMIT 1`;
    return rows[0]?.scheduleCategories ?? null;
  } catch {
    // Older deployed DBs may not have the column yet. Sign-in should still work.
    return null;
  }
}

async function getWorkspaceUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: workspaceSelect,
  });
  if (!user) return null;
  return { ...user, scheduleCategories: await getScheduleCategories(userId) };
}

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const user = await getWorkspaceUser(userId);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => ({})) as { name?: unknown; scheduleCategories?: unknown };
  const data: { name?: string } = {};
  let serializedCategories: string | null | undefined;

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

  if (!Object.keys(data).length && serializedCategories === undefined) return NextResponse.json({ error: "No profile changes provided" }, { status: 400 });

  if (Object.keys(data).length) {
    await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true },
    });
  }

  if (serializedCategories !== undefined) {
    try {
      await prisma.$executeRaw`UPDATE "User" SET "scheduleCategories" = ${serializedCategories} WHERE id = ${userId}`;
    } catch {
      // Keep profile saves non-fatal on older DBs until the migration is applied.
    }
  }

  const user = await getWorkspaceUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

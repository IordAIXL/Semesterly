import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { code?: string; name?: string; color?: string; importance?: number; location?: string | null } | null;
  const existing = await prisma.course.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const course = await prisma.course.update({
    where: { id },
    data: {
      code: body?.code ? body.code.trim().toUpperCase() : undefined,
      name: body?.name ? body.name.trim() : undefined,
      color: body?.color,
      importance: body?.importance,
      location: body?.location,
    },
  });

  return NextResponse.json({ course });
}

export async function DELETE(request: NextRequest, context: Params) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  const { id } = await context.params;
  const existing = await prisma.course.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

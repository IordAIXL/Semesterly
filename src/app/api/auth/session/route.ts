import { NextRequest, NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const auth = getSessionAuth(request);
  if (!auth) return NextResponse.json({ user: null }, { status: 401, headers: noStore });

  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, name: true, email: true, role: true } });
  if (!user) return NextResponse.json({ user: null }, { status: 401, headers: noStore });

  return NextResponse.json({ user }, { headers: noStore });
}

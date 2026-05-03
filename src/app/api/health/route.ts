import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Database health check failed" }, { status: 500 });
  }
}

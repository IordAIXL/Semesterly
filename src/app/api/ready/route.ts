import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks = {
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    databaseReachable: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.databaseReachable = true;
  } catch {
    checks.databaseReachable = false;
  }

  const ok = checks.databaseUrlConfigured && checks.databaseReachable;
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}

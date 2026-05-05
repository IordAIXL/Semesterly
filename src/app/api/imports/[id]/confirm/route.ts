import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api-response";
import { confirmImportBatch } from "@/lib/imports";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { approvedItemIds?: string[] };
  try {
    const created = await prisma.$transaction((tx) => confirmImportBatch(tx, userId, id, Array.isArray(body.approvedItemIds) ? body.approvedItemIds : undefined));
    return jsonNoStore({ ok: true, created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not confirm import" }, { status: 400 });
  }
}

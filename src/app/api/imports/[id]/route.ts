import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api-response";
import { normalizeImportItem } from "@/lib/imports";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const { id } = await context.params;
  const batch = await prisma.importBatch.findFirst({ where: { id, userId }, include: { items: true } });
  if (!batch) return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  return jsonNoStore({ batch });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: string; summary?: string; items?: Array<{ id?: string; itemType?: string; status?: string; confidence?: number; rawText?: string; data?: unknown }> } | null;
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const batch = await prisma.importBatch.findFirst({ where: { id, userId }, include: { items: true } });
  if (!batch) return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  if (batch.status === "CONFIRMED") return NextResponse.json({ error: "Confirmed imports cannot be edited" }, { status: 409 });

  try {
    await prisma.$transaction(async (tx) => {
      if (body.status || body.summary !== undefined) {
        await tx.importBatch.update({
          where: { id },
          data: {
            status: body.status && ["NEEDS_REVIEW", "CONFIRMED", "DISCARDED"].includes(body.status) ? body.status : undefined,
            summary: body.summary,
          },
        });
      }

      for (const item of body.items ?? []) {
        if (!item.id) continue;
        const current = batch.items.find((entry) => entry.id === item.id);
        if (!current) throw new Error("Import item not found");
        const normalized = item.data ? normalizeImportItem({ ...item, itemType: item.itemType ?? current.itemType }) : null;
        await tx.importItem.update({
          where: { id: item.id },
          data: {
            status: item.status && ["PENDING", "APPROVED", "REJECTED"].includes(item.status) ? item.status : undefined,
            confidence: normalized?.confidence,
            rawText: item.rawText,
            data: normalized?.data,
          },
        });
      }
    });
    const updated = await prisma.importBatch.findFirst({ where: { id, userId }, include: { items: true } });
    return jsonNoStore({ batch: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update import" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const { id } = await context.params;
  const batch = await prisma.importBatch.findFirst({ where: { id, userId } });
  if (!batch) return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  await prisma.importBatch.update({ where: { id }, data: { status: "DISCARDED" } });
  return jsonNoStore({ ok: true });
}

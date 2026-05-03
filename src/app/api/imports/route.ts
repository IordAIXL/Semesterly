import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { isImportKind, normalizeImportItems, type DraftImportBody } from "@/lib/imports";

async function readImportBody(request: NextRequest): Promise<DraftImportBody | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const itemsRaw = form.get("items");
    const kind = form.get("kind");
    const sourceText = form.get("sourceText");
    const summary = form.get("summary");
    const items = typeof itemsRaw === "string" && itemsRaw.trim() ? JSON.parse(itemsRaw) : undefined;
    return {
      kind: typeof kind === "string" ? kind : undefined,
      sourceName: file instanceof File ? file.name : undefined,
      sourceMime: file instanceof File ? file.type : undefined,
      sourceText: typeof sourceText === "string" ? sourceText : undefined,
      summary: typeof summary === "string" ? summary : undefined,
      items,
    };
  }
  return request.json().catch(() => null) as Promise<DraftImportBody | null>;
}

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;
  const batches = await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json({ batches });
}

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (isAuthResponse(auth)) return auth;
  const { userId } = auth;

  try {
    const body = await readImportBody(request);
    if (!body || !isImportKind(body.kind)) return NextResponse.json({ error: "Import kind must be SYLLABUS, SCHEDULE_SCREENSHOT, or CANVAS" }, { status: 400 });
    const items = normalizeImportItems(body.items);
    const batch = await prisma.importBatch.create({
      data: {
        userId,
        kind: body.kind,
        sourceName: body.sourceName,
        sourceMime: body.sourceMime,
        sourceText: body.sourceText,
        summary: body.summary ?? `${items.length} item${items.length === 1 ? "" : "s"} ready for review`,
        items: { create: items },
      },
      include: { items: true },
    });
    return NextResponse.json({ batch, nextStep: "Review imported data before saving anything to Semesterly." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create import" }, { status: 400 });
  }
}

import type { PrismaClient } from "@prisma/client";

type PrismaTx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export const IMPORT_KINDS = ["SYLLABUS", "SCHEDULE_SCREENSHOT", "CANVAS"] as const;
export const IMPORT_ITEM_TYPES = ["COURSE", "COURSE_MEETING", "TASK", "EVENT"] as const;
export const IMPORT_ITEM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type ImportKind = (typeof IMPORT_KINDS)[number];
export type ImportItemType = (typeof IMPORT_ITEM_TYPES)[number];
export type ImportItemStatus = (typeof IMPORT_ITEM_STATUSES)[number];

type DraftImportItemInput = {
  itemType?: string;
  status?: string;
  confidence?: number;
  rawText?: string;
  data?: unknown;
};

export type DraftImportBody = {
  kind?: string;
  sourceName?: string;
  sourceMime?: string;
  sourceText?: string;
  summary?: string;
  items?: DraftImportItemInput[];
};

type CourseImportData = {
  code: string;
  name: string;
  color?: string;
  importance?: number;
  professor?: string;
  location?: string;
};

type CourseMeetingImportData = {
  courseCode?: string;
  courseId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
};

type TaskImportData = {
  title: string;
  courseCode?: string;
  courseId?: string;
  dueAt: string;
  notes?: string;
  estimatedMinutes?: number;
  importance?: number;
};

type EventImportData = {
  title: string;
  courseCode?: string;
  courseId?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  category?: "CLASS" | "STUDY" | "PERSONAL" | "WORK" | "CLUB" | "OTHER";
};

export function isImportKind(value: string | undefined): value is ImportKind {
  return Boolean(value && IMPORT_KINDS.includes(value as ImportKind));
}

function isImportItemType(value: string | undefined): value is ImportItemType {
  return Boolean(value && IMPORT_ITEM_TYPES.includes(value as ImportItemType));
}

function isImportItemStatus(value: string | undefined): value is ImportItemStatus {
  return Boolean(value && IMPORT_ITEM_STATUSES.includes(value as ImportItemStatus));
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Import item data must be an object");
  return value as Record<string, unknown>;
}

function stringField(data: Record<string, unknown>, key: string, required = true) {
  const value = data[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!required) return undefined;
  throw new Error(`${key} is required`);
}

function numberField(data: Record<string, unknown>, key: string, fallback?: number) {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function requiredString(data: Record<string, unknown>, key: string) {
  return stringField(data, key, true) as string;
}

function dateField(data: Record<string, unknown>, key: string) {
  const value = requiredString(data, key);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date`);
  return date.toISOString();
}

function timeField(data: Record<string, unknown>, key: string) {
  const value = requiredString(data, key);
  if (!/^\d{1,2}:\d{2}$/.test(value)) throw new Error(`${key} must use HH:mm time`);
  return value;
}

export function normalizeImportItem(input: DraftImportItemInput) {
  if (!isImportItemType(input.itemType)) throw new Error("Invalid import item type");
  const data = asObject(input.data);
  const confidence = typeof input.confidence === "number" && Number.isFinite(input.confidence) ? Math.max(0, Math.min(1, input.confidence)) : undefined;
  const status = isImportItemStatus(input.status) ? input.status : "PENDING";

  let normalized: CourseImportData | CourseMeetingImportData | TaskImportData | EventImportData;
  if (input.itemType === "COURSE") {
    normalized = {
      code: requiredString(data, "code").toUpperCase(),
      name: requiredString(data, "name"),
      color: stringField(data, "color", false) ?? "#1a73e8",
      importance: numberField(data, "importance", 3),
      professor: stringField(data, "professor", false),
      location: stringField(data, "location", false),
    };
  } else if (input.itemType === "COURSE_MEETING") {
    const dayOfWeek = numberField(data, "dayOfWeek");
    if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) throw new Error("dayOfWeek must be 0-6");
    normalized = {
      courseCode: stringField(data, "courseCode", false)?.toUpperCase(),
      courseId: stringField(data, "courseId", false),
      dayOfWeek,
      startTime: timeField(data, "startTime"),
      endTime: timeField(data, "endTime"),
      location: stringField(data, "location", false),
    };
  } else if (input.itemType === "TASK") {
    normalized = {
      title: requiredString(data, "title"),
      courseCode: stringField(data, "courseCode", false)?.toUpperCase(),
      courseId: stringField(data, "courseId", false),
      dueAt: dateField(data, "dueAt"),
      notes: stringField(data, "notes", false),
      estimatedMinutes: numberField(data, "estimatedMinutes", 60),
      importance: numberField(data, "importance", 3),
    };
  } else {
    const startsAt = dateField(data, "startsAt");
    const endsAt = dateField(data, "endsAt");
    if (new Date(endsAt) <= new Date(startsAt)) throw new Error("Event end must be after start");
    const category = stringField(data, "category", false);
    normalized = {
      title: requiredString(data, "title"),
      courseCode: stringField(data, "courseCode", false)?.toUpperCase(),
      courseId: stringField(data, "courseId", false),
      startsAt,
      endsAt,
      location: stringField(data, "location", false),
      category: category === "CLASS" || category === "STUDY" || category === "PERSONAL" || category === "WORK" || category === "CLUB" || category === "OTHER" ? category : "OTHER",
    };
  }

  return {
    itemType: input.itemType,
    status,
    confidence,
    rawText: typeof input.rawText === "string" ? input.rawText : undefined,
    data: JSON.stringify(normalized),
  };
}

export function normalizeImportItems(items: DraftImportItemInput[] | undefined) {
  return (items ?? []).map(normalizeImportItem);
}

export function parseImportData<T>(value: string): T {
  return JSON.parse(value) as T;
}

async function findCourse(tx: PrismaTx, userId: string, courseId?: string, courseCode?: string) {
  if (courseId) return tx.course.findFirst({ where: { id: courseId, userId } });
  if (courseCode) return tx.course.findFirst({ where: { userId, code: courseCode.toUpperCase() } });
  return null;
}

export async function confirmImportBatch(tx: PrismaTx, userId: string, batchId: string, approvedItemIds?: string[]) {
  const batch = await tx.importBatch.findFirst({ where: { id: batchId, userId }, include: { items: true } });
  if (!batch) throw new Error("Import batch not found");
  if (batch.status === "CONFIRMED") throw new Error("Import batch already confirmed");

  const approved = batch.items.filter((item) => {
    if (approvedItemIds?.length) return approvedItemIds.includes(item.id);
    return item.status === "APPROVED" || item.status === "PENDING";
  });

  const created = { courses: [] as unknown[], meetings: [] as unknown[], tasks: [] as unknown[], events: [] as unknown[] };
  const courseByCode = new Map<string, { id: string; code: string }>();

  for (const item of approved.filter((entry) => entry.itemType === "COURSE")) {
    const data = parseImportData<CourseImportData>(item.data);
    const existing = await findCourse(tx, userId, undefined, data.code);
    const course = existing ?? await tx.course.create({
      data: {
        userId,
        code: data.code,
        name: data.name,
        color: data.color ?? "#1a73e8",
        importance: data.importance ?? 3,
        professor: data.professor,
        location: data.location,
      },
    });
    courseByCode.set(course.code.toUpperCase(), { id: course.id, code: course.code });
    created.courses.push(course);
  }

  for (const item of approved.filter((entry) => entry.itemType === "COURSE_MEETING")) {
    const data = parseImportData<CourseMeetingImportData>(item.data);
    const course = data.courseCode && courseByCode.get(data.courseCode) ? courseByCode.get(data.courseCode)! : await findCourse(tx, userId, data.courseId, data.courseCode);
    if (!course) throw new Error(`Course missing for meeting ${data.courseCode ?? data.courseId ?? "unknown"}`);
    const meeting = await tx.courseMeeting.create({ data: { courseId: course.id, dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, location: data.location } });
    created.meetings.push(meeting);
  }

  for (const item of approved.filter((entry) => entry.itemType === "TASK")) {
    const data = parseImportData<TaskImportData>(item.data);
    const course = data.courseCode && courseByCode.get(data.courseCode) ? courseByCode.get(data.courseCode)! : await findCourse(tx, userId, data.courseId, data.courseCode);
    const task = await tx.task.create({
      data: {
        userId,
        courseId: course?.id,
        title: data.title,
        notes: data.notes,
        dueAt: new Date(data.dueAt),
        estimatedMinutes: data.estimatedMinutes ?? 60,
        importance: data.importance ?? 3,
      },
    });
    created.tasks.push(task);
  }

  for (const item of approved.filter((entry) => entry.itemType === "EVENT")) {
    const data = parseImportData<EventImportData>(item.data);
    const course = data.courseCode && courseByCode.get(data.courseCode) ? courseByCode.get(data.courseCode)! : await findCourse(tx, userId, data.courseId, data.courseCode);
    const event = await tx.event.create({
      data: {
        userId,
        courseId: course?.id,
        title: data.title,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        location: data.location,
        category: data.category ?? "OTHER",
        source: batch.kind.toLowerCase(),
      },
    });
    created.events.push(event);
  }

  await tx.importItem.updateMany({ where: { batchId, id: { in: approved.map((item) => item.id) } }, data: { status: "APPROVED" } });
  await tx.importBatch.update({ where: { id: batchId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });

  return created;
}

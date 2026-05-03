import type { Course, Task } from "./types";

const dayNumbers: Record<string, number> = {
  sunday: 7,
  sun: 7,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function nextDay(target: number) {
  const date = new Date();
  const current = date.getDay() || 7;
  date.setDate(date.getDate() + ((target - current + 7) % 7));
  return date;
}

function dueDateFromText(text: string) {
  const lower = text.toLowerCase();
  const date = new Date();

  if (lower.includes("tomorrow")) date.setDate(date.getDate() + 1);
  else if (lower.includes("next week")) date.setDate(date.getDate() + 7);
  else {
    const day = Object.entries(dayNumbers).find(([name]) => lower.includes(name));
    if (day) return nextDay(day[1]);
  }

  return date;
}

function timeFromText(text: string) {
  const lower = text.toLowerCase();
  const explicit = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (explicit) {
    let hour = Number(explicit[1]);
    const minute = explicit[2] ? Number(explicit[2]) : 0;
    if (explicit[3] === "pm" && hour < 12) hour += 12;
    if (explicit[3] === "am" && hour === 12) hour = 0;
    return { hour, minute };
  }
  if (lower.includes("morning")) return { hour: 9, minute: 0 };
  if (lower.includes("noon")) return { hour: 12, minute: 0 };
  if (lower.includes("evening")) return { hour: 18, minute: 0 };
  return { hour: 23, minute: 59 };
}

export function parseTaskInput(input: string, courses: Course[]): Task | null {
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const course = courses.find((item) => {
    const code = item.code.toLowerCase();
    const compactCode = code.replace(/\s+/g, "");
    const prefix = code.split(/\s+/)[0];
    return lower.includes(code) || lower.includes(compactCode) || lower.includes(prefix) || lower.includes(item.name.toLowerCase());
  });
  const dueAt = dueDateFromText(raw);
  const time = timeFromText(raw);
  dueAt.setHours(time.hour, time.minute, 0, 0);

  const minuteMatch = lower.match(/(\d+)\s*(min|minute|minutes|hr|hour|hours)/);
  const estimatedMinutes = minuteMatch ? Number(minuteMatch[1]) * (minuteMatch[2].startsWith("h") ? 60 : 1) : 60;
  const importance = lower.includes("exam") || lower.includes("project") || lower.includes("lab") ? 5 : lower.includes("quiz") || lower.includes("homework") || lower.includes("hw") ? 4 : 3;

  return {
    id: `smart-${Date.now()}`,
    title: raw.replace(/\s+/g, " ").slice(0, 80),
    courseId: course?.id,
    dueAt: dueAt.toISOString(),
    estimatedMinutes,
    importance,
    status: "NOT_STARTED",
  };
}

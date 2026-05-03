import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Course, PriorityResult, Task } from "./types";

export function scoreTask(task: Task, courses: Course[], now = new Date()): PriorityResult {
  if (task.status === "DONE") {
    return { ...task, score: 0, reason: "Completed tasks are hidden from active priority.", course: courses.find((course) => course.id === task.courseId) };
  }

  const due = parseISO(task.dueAt);
  const daysUntilDue = differenceInCalendarDays(due, now);
  const course = courses.find((item) => item.id === task.courseId);

  let urgency = 0;
  if (daysUntilDue < 0) urgency = 60;
  else if (daysUntilDue === 0) urgency = 48;
  else if (daysUntilDue === 1) urgency = 38;
  else if (daysUntilDue <= 3) urgency = 28;
  else if (daysUntilDue <= 7) urgency = 16;
  else urgency = 6;

  const importance = task.importance * 7;
  const courseWeight = (course?.importance ?? 3) * 4;
  const effort = task.estimatedMinutes >= 120 ? 14 : task.estimatedMinutes >= 60 ? 9 : 4;
  const statusBoost = task.status === "NOT_STARTED" ? 10 : 4;
  const score = urgency + importance + courseWeight + effort + statusBoost;

  const reasonParts: string[] = [];
  if (daysUntilDue < 0) reasonParts.push("overdue");
  else if (daysUntilDue === 0) reasonParts.push("due today");
  else if (daysUntilDue === 1) reasonParts.push("due tomorrow");
  else if (daysUntilDue <= 3) reasonParts.push("due soon");
  else reasonParts.push(`due in ${daysUntilDue} days`);

  if (task.status === "NOT_STARTED") reasonParts.push("not started");
  if (task.estimatedMinutes >= 90) reasonParts.push("needs a real work block");
  if ((course?.importance ?? 3) >= 4 || task.importance >= 4) reasonParts.push("high importance");

  return {
    ...task,
    score,
    course,
    reason: `High because it is ${reasonParts.join(", ")}.`,
  };
}

export function prioritizeTasks(tasks: Task[], courses: Course[], now = new Date()): PriorityResult[] {
  return tasks
    .map((task) => scoreTask(task, courses, now))
    .filter((task) => task.status !== "DONE")
    .sort((a, b) => b.score - a.score);
}


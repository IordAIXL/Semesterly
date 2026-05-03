import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Course, Task } from "./types";

export type Recommendation = {
  title: string;
  detail: string;
  tone: "blue" | "green" | "red";
};

export function buildRecommendations(tasks: Task[], courses: Course[]): Recommendation[] {
  const active = tasks.filter((task) => task.status !== "DONE");
  const dueSoon = active.filter((task) => differenceInCalendarDays(parseISO(task.dueAt), new Date()) <= 1);
  const heavy = [...active].sort((a, b) => b.estimatedMinutes - a.estimatedMinutes)[0];
  const notStarted = active.filter((task) => task.status === "NOT_STARTED");
  const heaviestCourse = courses
    .map((course) => ({ course, count: active.filter((task) => task.courseId === course.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  const recommendations: Recommendation[] = [];

  if (dueSoon.length) {
    recommendations.push({
      title: "Protect the next deadline",
      detail: `${dueSoon[0].title} should happen before anything flexible.`,
      tone: "red",
    });
  }

  if (heavy) {
    recommendations.push({
      title: "Block real focus time",
      detail: `${heavy.title} needs ${heavy.estimatedMinutes} minutes. Do not leave it for a gap between classes.`,
      tone: "blue",
    });
  }

  if (notStarted.length >= 2) {
    recommendations.push({
      title: "Start one unfinished item",
      detail: `${notStarted.length} tasks are not started. Starting one lowers tomorrow's load.`,
      tone: "green",
    });
  }

  if (heaviestCourse?.count) {
    recommendations.push({
      title: "Watch course balance",
      detail: `${heaviestCourse.course.code} is carrying the most open work right now.`,
      tone: "blue",
    });
  }

  return recommendations.slice(0, 4);
}

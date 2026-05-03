import type { Course, ScheduleEvent, Task } from "./types";

export const sampleUser = {
  id: "sample-user-1",
  name: "Maya Chen",
  school: "Texas A&M",
  year: "Sophomore",
  major: "Business",
  timezone: "America/Chicago",
};

const now = new Date();
const at = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const courses: Course[] = [
  { id: "acct", code: "ACCT 229", name: "Accounting", color: "#1a73e8", importance: 4 },
  { id: "econ", code: "ECON 203", name: "Microeconomics", color: "#188038", importance: 3 },
  { id: "cs", code: "CSCE 110", name: "Programming", color: "#f9ab00", importance: 5 },
  { id: "mgmt", code: "MGMT 211", name: "Business Comm", color: "#a142f4", importance: 3 },
];

export const tasks: Task[] = [
  { id: "t1", title: "Finish CS checkpoint", courseId: "cs", dueAt: at(0, 23, 59), estimatedMinutes: 150, importance: 5, status: "IN_PROGRESS" },
  { id: "t2", title: "ECON problem set", courseId: "econ", dueAt: at(1, 17, 0), estimatedMinutes: 90, importance: 4, status: "NOT_STARTED" },
  { id: "t3", title: "Read accounting ch. 6", courseId: "acct", dueAt: at(3, 12, 0), estimatedMinutes: 45, importance: 3, status: "NOT_STARTED" },
  { id: "t4", title: "Presentation outline", courseId: "mgmt", dueAt: at(2, 21, 0), estimatedMinutes: 75, importance: 4, status: "NOT_STARTED" },
  { id: "t5", title: "Review quiz notes", courseId: "acct", dueAt: at(0, 18, 30), estimatedMinutes: 35, importance: 3, status: "NOT_STARTED" },
];

export const schedule: ScheduleEvent[] = [
  { id: "e1", title: "CSCE lecture", courseId: "cs", startsAt: at(0, 9, 10), endsAt: at(0, 10, 0), location: "ZACH 310", category: "CLASS" },
  { id: "e2", title: "ECON lecture", courseId: "econ", startsAt: at(0, 10, 20), endsAt: at(0, 11, 10), location: "HELD 111", category: "CLASS" },
  { id: "e3", title: "ACCT lecture", courseId: "acct", startsAt: at(0, 12, 40), endsAt: at(0, 13, 30), location: "Wehner", category: "CLASS" },
  { id: "e4", title: "Focus block", startsAt: at(0, 16, 0), endsAt: at(0, 17, 30), location: "Evans Library", category: "STUDY" },
  { id: "e5", title: "Group meeting", courseId: "mgmt", startsAt: at(1, 15, 30), endsAt: at(1, 16, 15), location: "Business Library", category: "STUDY" },
];

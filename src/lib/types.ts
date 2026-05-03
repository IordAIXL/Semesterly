export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export type Course = {
  id: string;
  code: string;
  name: string;
  color: string;
  importance: number;
};

export type Task = {
  id: string;
  title: string;
  courseId?: string;
  dueAt: string;
  estimatedMinutes: number;
  importance: number;
  status: TaskStatus;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  courseId?: string;
  category: "CLASS" | "STUDY" | "PERSONAL" | "WORK" | "CLUB" | "OTHER";
};

export type PriorityResult = Task & {
  score: number;
  reason: string;
  course?: Course;
};


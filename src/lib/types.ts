export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";
export type AssignmentType = "ASSIGNMENT" | "HOMEWORK" | "QUIZ" | "EXAM" | "PROJECT" | "ESSAY" | "READING" | "LAB" | "OTHER";

export type Course = {
  id: string;
  code: string;
  name: string;
  color: string;
  importance: number;
  location?: string | null;
};

export type Task = {
  id: string;
  title: string;
  assignmentType?: AssignmentType;
  remarks?: string | null;
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
  category: string;
};

export type PriorityResult = Task & {
  score: number;
  reason: string;
  course?: Course;
};


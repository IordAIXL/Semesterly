import type { Course, ScheduleEvent, Task, TaskStatus } from "./types";

export type SampleStudent = {
  id: string;
  name: string;
  school: string;
  year: string;
  major: string;
  courses: Course[];
  tasks: Task[];
  schedule: ScheduleEvent[];
};

const now = new Date();
const at = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function next(day: keyof typeof dayMap, hour: number, minute = 0) {
  const current = now.getDay() || 7;
  const target = dayMap[day];
  const diff = (target - current + 7) % 7;
  return at(diff, hour, minute);
}

function course(id: string, code: string, name: string, color: string, importance: number): Course {
  return { id, code, name, color, importance };
}
function task(id: string, title: string, courseId: string | undefined, dueAt: string, estimatedMinutes: number, importance: number, status: TaskStatus): Task {
  return { id, title, courseId, dueAt, estimatedMinutes, importance, status };
}
function event(id: string, title: string, startsAt: string, category: ScheduleEvent["category"], location?: string, courseId?: string): ScheduleEvent {
  const end = new Date(startsAt);
  end.setMinutes(end.getMinutes() + 60);
  return { id, title, startsAt, endsAt: end.toISOString(), category, location, courseId };
}

export const sampleStudents: SampleStudent[] = [
  {
    id: "emma",
    name: "Emma Rodriguez",
    school: "Texas A&M University",
    year: "Sophomore",
    major: "Biology",
    courses: [course("biol111", "BIOL 111", "Intro Biology", "#1a73e8", 5), course("chem120", "CHEM 120", "General Chemistry", "#188038", 5)],
    tasks: [task("emma-1", "Lab Report 2", "biol111", next("Wed", 23, 59), 120, 5, "IN_PROGRESS"), task("emma-2", "Problem Set 3", "chem120", next("Thu", 10), 90, 4, "NOT_STARTED")],
    schedule: [event("emma-e1", "Study Group", next("Tue", 18), "STUDY", "Evans Library"), event("emma-e2", "Gym", next("Fri", 17), "PERSONAL", "Rec Center")],
  },
  {
    id: "liam",
    name: "Liam Chen",
    school: "UT Austin",
    year: "Junior",
    major: "Computer Science",
    courses: [course("cs314", "CS 314", "Data Structures", "#f9ab00", 5), course("math341", "MATH 341", "Linear Algebra", "#a142f4", 4)],
    tasks: [task("liam-1", "Coding Project 1", "cs314", next("Sun", 23, 59), 300, 5, "IN_PROGRESS"), task("liam-2", "HW 5", "math341", next("Thu", 17), 120, 4, "NOT_STARTED")],
    schedule: [event("liam-e1", "Hackathon Prep", next("Sat", 13), "CLUB", "GDC"), event("liam-e2", "Part-time Shift", next("Wed", 18), "WORK", "Campus IT Desk")],
  },
  {
    id: "ava",
    name: "Ava Patel",
    school: "Baylor University",
    year: "Freshman",
    major: "Nursing",
    courses: [course("nurs130", "NURS 130", "Foundations", "#d93025", 5), course("psyc1301", "PSYC 1301", "Intro Psych", "#1a73e8", 4)],
    tasks: [task("ava-1", "Reflection Essay", "nurs130", next("Fri", 17), 60, 4, "DONE"), task("ava-2", "Quiz Prep", "psyc1301", next("Tue", 9), 45, 3, "IN_PROGRESS")],
    schedule: [event("ava-e1", "Church Group", next("Sun", 19), "PERSONAL", "Chapel"), event("ava-e2", "Study Time", next("Wed", 16), "STUDY", "Library")],
  },
  {
    id: "noah",
    name: "Noah Williams",
    school: "Texas Tech",
    year: "Senior",
    major: "Finance",
    courses: [course("fin332", "FIN 332", "Investments", "#188038", 5), course("acct230", "ACCT 230", "Accounting", "#1a73e8", 5)],
    tasks: [task("noah-1", "Stock Analysis", "fin332", next("Fri", 23, 59), 180, 5, "IN_PROGRESS"), task("noah-2", "Midterm Study", "acct230", next("Mon", 20), 120, 5, "NOT_STARTED")],
    schedule: [event("noah-e1", "Internship Shift", next("Tue", 15), "WORK", "Downtown Office"), event("noah-e2", "Basketball", next("Thu", 19), "PERSONAL", "Rec Center")],
  },
  {
    id: "sophia",
    name: "Sophia Martinez",
    school: "University of Houston",
    year: "Junior",
    major: "Marketing",
    courses: [course("mktg333", "MKTG 333", "Consumer Behavior", "#a142f4", 4), course("comm130", "COMM 130", "Public Speaking", "#f9ab00", 3)],
    tasks: [task("sophia-1", "Presentation Slides", "comm130", next("Thu", 9), 90, 4, "IN_PROGRESS"), task("sophia-2", "Case Study", "mktg333", next("Sun", 18), 150, 5, "NOT_STARTED")],
    schedule: [event("sophia-e1", "Club Meeting", next("Wed", 18, 30), "CLUB", "Student Center"), event("sophia-e2", "Work Shift", next("Sat", 12), "WORK", "Retail Store")],
  },
];

const condensed = [
  ["ethan", "Ethan Brown", "Texas State", "Sophomore", "Psychology", "PSYC 230", "Cognitive Psych", "STAT 201", "Statistics", "Data Analysis", "Thu", 120, 5, "IN_PROGRESS"],
  ["olivia", "Olivia Davis", "Rice University", "Senior", "Physics", "PHYS 401", "Quantum Mechanics", "MATH 410", "Differential Equations", "Problem Set", "Fri", 240, 5, "IN_PROGRESS"],
  ["mason", "Mason Johnson", "Texas A&M", "Freshman", "Engineering", "ENGR 102", "Engineering", "CALC 151", "Calculus", "Coding Task", "Sun", 180, 5, "NOT_STARTED"],
  ["isabella", "Isabella Moore", "SMU", "Junior", "Journalism", "JOUR 301", "Reporting", "LAW 220", "Media Law", "Article Draft", "Fri", 120, 5, "IN_PROGRESS"],
  ["james", "James Taylor", "UT Dallas", "Senior", "IT", "ITS 430", "Cybersecurity", "DB 330", "Databases", "Security Lab", "Sun", 180, 5, "NOT_STARTED"],
  ["mia", "Mia Anderson", "Baylor", "Sophomore", "Education", "EDU 210", "Teaching Methods", "DEV 220", "Child Dev", "Lesson Plan", "Thu", 90, 4, "IN_PROGRESS"],
  ["benjamin", "Benjamin Thomas", "Texas Tech", "Junior", "Architecture", "ARCH 301", "Design Studio", "ARCH 220", "History", "Model Build", "Sun", 300, 5, "IN_PROGRESS"],
  ["charlotte", "Charlotte Jackson", "UH", "Freshman", "English", "ENGL 130", "Literature", "WRIT 101", "Writing", "Essay", "Fri", 120, 4, "NOT_STARTED"],
  ["lucas", "Lucas White", "Texas State", "Senior", "Kinesiology", "KIN 330", "Exercise Science", "NUTR 210", "Nutrition", "Diet Plan", "Wed", 60, 3, "DONE"],
  ["amelia", "Amelia Harris", "Rice", "Junior", "Chemistry", "CHEM 301", "Organic Chem", "CHEM 311", "Lab", "Lab Report", "Mon", 180, 5, "IN_PROGRESS"],
  ["elijah", "Elijah Martin", "UT Austin", "Sophomore", "Economics", "ECON 301", "Microeconomics", "STAT 309", "Stats", "Problem Set", "Thu", 120, 4, "NOT_STARTED"],
  ["harper", "Harper Thompson", "Texas A&M", "Senior", "Animal Science", "ANSC 320", "Animal Nutrition", "GEN 210", "Genetics", "Case Study", "Fri", 150, 5, "IN_PROGRESS"],
  ["alexander", "Alexander Garcia", "SMU", "Freshman", "Business", "BUS 101", "Intro Business", "ACCT 101", "Accounting", "Quiz Prep", "Tue", 60, 3, "DONE"],
  ["evelyn", "Evelyn Martinez", "UT Dallas", "Junior", "Graphic Design", "ART 330", "Design Studio", "TYPO 220", "Typography", "Poster Project", "Sun", 180, 5, "IN_PROGRESS"],
  ["daniel", "Daniel Robinson", "Baylor", "Sophomore", "History", "HIST 230", "US History", "POLS 210", "Political Science", "Essay Draft", "Wed", 120, 4, "NOT_STARTED"],
] as const;

export const allSampleStudents: SampleStudent[] = [
  ...sampleStudents,
  ...condensed.map((row): SampleStudent => {
    const [id, name, school, year, major, c1, n1, c2, n2, assignment, dueDay, minutes, importance, status] = row;
    return {
      id,
      name,
      school,
      year,
      major,
      courses: [course(`${id}-c1`, c1, n1, "#1a73e8", 5), course(`${id}-c2`, c2, n2, "#188038", 4)],
      tasks: [task(`${id}-t1`, assignment, `${id}-c1`, next(dueDay, 17), minutes, importance, status), task(`${id}-t2`, "Review notes", `${id}-c2`, next("Thu", 20), 60, 3, "NOT_STARTED")],
      schedule: [event(`${id}-e1`, "Study block", next("Wed", 16), "STUDY", "Library"), event(`${id}-e2`, "Personal time", next("Fri", 17), "PERSONAL")],
    };
  }),
];

export const defaultStudent = allSampleStudents[0];

"use client";

import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { allSampleStudents, defaultStudent } from "@/lib/sample-users";
import { parseTaskInput } from "@/lib/natural-language";
import { prioritizeTasks } from "@/lib/priority";
import { buildRecommendations } from "@/lib/recommendations";
import type { Course, ScheduleEvent, Task, TaskStatus } from "@/lib/types";

type View = "dashboard" | "calendar" | "courses" | "profile" | "admin";
type CalendarMode = "day" | "week" | "month" | "semester";

type DraftTask = {
  title: string;
  courseId: string;
  dueDate: string;
  dueTime: string;
  estimatedMinutes: number;
  importance: number;
};

type DraftCourse = {
  code: string;
  name: string;
  color: string;
  importance: number;
  location: string;
};

type DraftEvent = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: ScheduleEvent["category"];
  courseId: string;
};

type DataMode = "loading" | "api" | "local";

type ApiStudent = {
  id: string;
  name: string;
  school?: string | null;
  year?: string | null;
  major?: string | null;
  scheduleCategories?: string | null;
  courses: Array<Course & { userId?: string }>;
  tasks: Array<Task & { userId?: string; dueAt: string | Date }>;
  events: Array<ScheduleEvent & { userId?: string; startsAt: string | Date; endsAt: string | Date }>;
};

type ScheduleCategory = {
  id: string;
  label: string;
  color: string;
};

type StudentProfile = {
  name: string;
  school?: string | null;
  year?: string | null;
  major?: string | null;
  scheduleCategories?: ScheduleCategory[];
};

const STORAGE_KEY = "semesterly.mvp.state.v2";
const AUTH_EMAIL_KEY = "semesterly.auth.email";
const today = new Date();
const isoDate = format(today, "yyyy-MM-dd");

const defaultTask: DraftTask = {
  title: "",
  courseId: "",
  dueDate: isoDate,
  dueTime: "23:59",
  estimatedMinutes: 60,
  importance: 3,
};

const defaultCourse: DraftCourse = {
  code: "",
  name: "",
  color: "#1a73e8",
  importance: 3,
  location: "",
};

const defaultEvent: DraftEvent = {
  title: "",
  date: isoDate,
  startTime: "14:00",
  endTime: "15:00",
  location: "",
  category: "STUDY",
  courseId: "",
};

function makeDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function statusLabel(status: TaskStatus) {
  if (status === "NOT_STARTED") return "Not started";
  if (status === "IN_PROGRESS") return "In progress";
  return "Done";
}

const defaultScheduleCategories: ScheduleCategory[] = [
  { id: "CLASS", label: "Class", color: "#1a73e8" },
  { id: "STUDY", label: "Study", color: "#34a853" },
  { id: "PERSONAL", label: "Personal", color: "#a142f4" },
  { id: "WORK", label: "Work", color: "#fbbc04" },
  { id: "CLUB", label: "Club", color: "#fa7b17" },
  { id: "OTHER", label: "Other", color: "#5f6368" },
];

function categoryId(label: string) {
  return label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28) || "OTHER";
}

function eventCategoryLabel(category: ScheduleEvent["category"], categories: ScheduleCategory[] = defaultScheduleCategories) {
  return categories.find((item) => item.id === category)?.label ?? category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function eventCategoryColor(category: ScheduleEvent["category"], categories: ScheduleCategory[] = defaultScheduleCategories) {
  return categories.find((item) => item.id === category)?.color ?? "#5f6368";
}

function mapLink(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function parseScheduleCategories(value?: string | null): ScheduleCategory[] {
  if (!value) return defaultScheduleCategories;
  try {
    const parsed = JSON.parse(value) as ScheduleCategory[];
    const custom = parsed.filter((item) => item?.id && item?.label && item?.color);
    return [...defaultScheduleCategories, ...custom.filter((item) => !defaultScheduleCategories.some((base) => base.id === item.id))];
  } catch {
    return defaultScheduleCategories;
  }
}

function customOnly(categories: ScheduleCategory[]) {
  return categories.filter((item) => !defaultScheduleCategories.some((base) => base.id === item.id));
}

function mapTask(task: ApiStudent["tasks"][number]): Task {
  return {
    id: task.id,
    title: task.title,
    courseId: task.courseId,
    dueAt: new Date(task.dueAt).toISOString(),
    estimatedMinutes: task.estimatedMinutes,
    importance: task.importance,
    status: task.status,
  };
}

function mapEvent(event: ApiStudent["events"][number]): ScheduleEvent {
  return {
    id: event.id,
    title: event.title,
    startsAt: new Date(event.startsAt).toISOString(),
    endsAt: new Date(event.endsAt).toISOString(),
    location: event.location,
    courseId: event.courseId,
    category: event.category,
  };
}

export function SemesterlyApp() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudent.id);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({ name: defaultStudent.name, school: defaultStudent.school, year: defaultStudent.year, major: defaultStudent.major, scheduleCategories: defaultScheduleCategories });
  const [courses, setCourses] = useState<Course[]>(defaultStudent.courses);
  const [tasks, setTasks] = useState<Task[]>(defaultStudent.tasks);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>(defaultStudent.schedule);
  const [taskDraft, setTaskDraft] = useState<DraftTask>(defaultTask);
  const [courseDraft, setCourseDraft] = useState<DraftCourse>(defaultCourse);
  const [eventDraft, setEventDraft] = useState<DraftEvent>(defaultEvent);
  const [smartInput, setSmartInput] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [focusBreaksEnabled, setFocusBreaksEnabled] = useState(false);
  const [focusBreakMinutes, setFocusBreakMinutes] = useState(5);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [useCookieSession, setUseCookieSession] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(AUTH_EMAIL_KEY);
    if (rememberedEmail) setLoginEmail(rememberedEmail);
    void loadInitialWorkspace();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.hostname === "localhost") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ courses, tasks, schedule, theme, focusBreaksEnabled, focusBreakMinutes, studentProfile }));
  }, [courses, tasks, schedule, theme, focusBreaksEnabled, focusBreakMinutes, studentProfile, loaded]);

  useEffect(() => {
    if (!actionNotice) return;
    const timeout = window.setTimeout(() => setActionNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [actionNotice]);

  const priorities = useMemo(() => prioritizeTasks(tasks, courses).slice(0, 8), [tasks, courses]);
  const activeTasks = tasks.filter((task) => task.status !== "DONE");
  const completedTasks = tasks.filter((task) => task.status === "DONE");
  const sortedSchedule = [...schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todaysSchedule = sortedSchedule.filter((event) => isSameDay(parseISO(event.startsAt), selectedDate));
  const dayLoad = activeTasks.length + todaysSchedule.length;
  const dayTone = dayLoad >= 8 ? "Heavy" : dayLoad >= 5 ? "Focused" : "Light";
  const focusMinutes = activeTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const dueSoon = [...activeTasks]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5);
  const upcomingEvents = sortedSchedule
    .filter((event) => parseISO(event.endsAt) > new Date() && !isSameDay(parseISO(event.startsAt), selectedDate))
    .slice(0, 5);
  const focusPlan = priorities.slice(0, 3);
  const recommendations = buildRecommendations(tasks, courses);
  const scheduleCategories = studentProfile.scheduleCategories ?? defaultScheduleCategories;
  const weekMinutes = activeTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const courseLoads = courses.map((course) => ({
    course,
    minutes: activeTasks.filter((task) => task.courseId === course.id).reduce((sum, task) => sum + task.estimatedMinutes, 0),
    open: activeTasks.filter((task) => task.courseId === course.id).length,
  })).sort((a, b) => b.minutes - a.minutes);

  function applyApiStudent(user: ApiStudent) {
    setStudentProfile({ name: user.name, school: user.school, year: user.year, major: user.major, scheduleCategories: parseScheduleCategories(user.scheduleCategories) });
    setCourses(user.courses.map((course) => ({ id: course.id, code: course.code, name: course.name, color: course.color, importance: course.importance, location: course.location })));
    setTasks(user.tasks.map(mapTask));
    setSchedule(user.events.map(mapEvent));
    setSelectedCourseId(null);
  }

  function applyLocalStudent(id: string, initial = false) {
    const fallback = allSampleStudents.find((student) => student.id === id) ?? defaultStudent;
    setStudentProfile({ name: fallback.name, school: fallback.school, year: fallback.year, major: fallback.major, scheduleCategories: defaultScheduleCategories });
    const saved = initial ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { courses: Course[]; tasks: Task[]; schedule: ScheduleEvent[]; theme?: "light" | "dark"; focusBreaksEnabled?: boolean; focusBreakMinutes?: number; studentProfile?: StudentProfile };
        setCourses(parsed.courses?.length ? parsed.courses : fallback.courses);
        setTasks(parsed.tasks?.length ? parsed.tasks : fallback.tasks);
        setSchedule(parsed.schedule?.length ? parsed.schedule : fallback.schedule);
        if (parsed.studentProfile?.name) setStudentProfile(parsed.studentProfile);
        setTheme(parsed.theme === "dark" ? "dark" : "light");
        setFocusBreaksEnabled(Boolean(parsed.focusBreaksEnabled));
        if (typeof parsed.focusBreakMinutes === "number" && Number.isFinite(parsed.focusBreakMinutes)) setFocusBreakMinutes(Math.min(30, Math.max(1, parsed.focusBreakMinutes)));
        return;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCourses(fallback.courses);
    setTasks(fallback.tasks);
    setSchedule(fallback.schedule);
    setSelectedCourseId(null);
  }

  async function createDemoSession(id: string) {
    setUseCookieSession(false);
    const response = await fetch("/api/auth/demo-session", { method: "POST", headers: { "x-user-id": id } });
    const body = await response.json().catch(() => ({})) as { token?: string };
    if (!response.ok || !body.token) throw new Error("Could not create demo session");
    setSessionToken(body.token);
    return body.token;
  }

  async function apiJson<T>(path: string, options: RequestInit = {}, userId = studentId, tokenOverride = sessionToken, cookieSessionOverride = useCookieSession): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    if (tokenOverride) headers.set("authorization", `Bearer ${tokenOverride}`);
    if (!tokenOverride && !cookieSessionOverride) headers.set("x-user-id", userId);
    const response = await fetch(path, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `${path} returned ${response.status}`);
    return body as T;
  }

  async function loadInitialWorkspace() {
    setDataMode("loading");
    try {
      const sessionResponse = await fetch("/api/auth/session");
      const sessionBody = await sessionResponse.json().catch(() => ({})) as { user?: { id: string } };
      if (sessionResponse.ok && sessionBody.user?.id) {
        setUseCookieSession(true);
        setSessionToken(null);
        setStudentId(sessionBody.user.id);
        const body = await apiJson<{ user: ApiStudent }>("/api/me", {}, sessionBody.user.id, null, true);
        applyApiStudent(body.user);
        setDataMode("api");
        setLoaded(true);
        return;
      }
    } catch {
      // Fall through to demo bridge/local fallback.
    }
    await loadStudentWorkspace(defaultStudent.id, true);
  }

  async function loadStudentWorkspace(id: string, initial = false) {
    setDataMode("loading");
    setStudentId(id);
    try {
      const token = await createDemoSession(id);
      const body = await apiJson<{ user: ApiStudent }>("/api/me", {}, id, token);
      applyApiStudent(body.user);
      setDataMode("api");
      if (!initial) setActionNotice(`Loaded ${body.user.name}'s API-backed workspace.`);
    } catch {
      applyLocalStudent(id, initial);
      setDataMode("local");
      if (!initial) {
        const fallback = allSampleStudents.find((student) => student.id === id) ?? defaultStudent;
        setActionNotice(`Loaded ${fallback.name}'s local demo workspace. API was unavailable.`);
      }
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (!mobileNavOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  async function addSmartTask() {
    const parsedTasks = smartInput
      .split(/\n+/)
      .map((line) => parseTaskInput(line, courses))
      .filter((task): task is Task => Boolean(task));
    if (!parsedTasks.length) return;

    if (dataMode === "api") {
      try {
        const created = await Promise.all(parsedTasks.map(async (task) => {
          const body = await apiJson<{ task: ApiStudent["tasks"][number] }>("/api/tasks", {
            method: "POST",
            body: JSON.stringify({ title: task.title, courseId: task.courseId, dueAt: task.dueAt, estimatedMinutes: task.estimatedMinutes, importance: task.importance }),
          });
          return mapTask(body.task);
        }));
        setTasks((items) => [...created, ...items]);
      } catch {
        setTasks((items) => [...parsedTasks, ...items]);
        setDataMode("local");
      }
    } else {
      setTasks((items) => [...parsedTasks, ...items]);
    }

    setSmartInput("");
    setActionNotice(`Captured ${parsedTasks.length} task${parsedTasks.length === 1 ? "" : "s"}.`);
    setView("courses");
  }

  async function addTask(destination: View = "dashboard") {
    if (!taskDraft.title.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: taskDraft.title.trim(),
      courseId: taskDraft.courseId || undefined,
      dueAt: makeDateTime(taskDraft.dueDate, taskDraft.dueTime),
      estimatedMinutes: Number(taskDraft.estimatedMinutes),
      importance: Number(taskDraft.importance),
      status: "NOT_STARTED",
    };
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ task: ApiStudent["tasks"][number] }>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ title: task.title, courseId: task.courseId, dueAt: task.dueAt, estimatedMinutes: task.estimatedMinutes, importance: task.importance }),
        });
        setTasks((items) => [mapTask(body.task), ...items]);
      } catch {
        setTasks((items) => [task, ...items]);
        setDataMode("local");
      }
    } else {
      setTasks((items) => [task, ...items]);
    }
    setTaskDraft({ ...defaultTask, courseId: taskDraft.courseId });
    setActionNotice(`Added ${task.title} to the priority queue.`);
    setView(destination);
  }

  async function addCourse() {
    if (!courseDraft.code.trim() || !courseDraft.name.trim()) return;
    const course: Course = {
      id: `course-${Date.now()}`,
      code: courseDraft.code.trim().toUpperCase(),
      name: courseDraft.name.trim(),
      color: courseDraft.color,
      importance: Number(courseDraft.importance),
      location: courseDraft.location.trim() || undefined,
    };
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ course: Course }>("/api/courses", {
          method: "POST",
          body: JSON.stringify({ code: course.code, name: course.name, color: course.color, importance: course.importance, location: course.location }),
        });
        setCourses((items) => [body.course, ...items]);
        setSelectedCourseId(body.course.id);
      } catch {
        setCourses((items) => [course, ...items]);
        setSelectedCourseId(course.id);
        setDataMode("local");
      }
    } else {
      setCourses((items) => [course, ...items]);
      setSelectedCourseId(course.id);
    }
    setCourseDraft(defaultCourse);
    setActionNotice(`Added ${course.code} and opened its course workspace.`);
    setView("courses");
  }

  async function addEvent(destination: View = "calendar") {
    if (!eventDraft.title.trim()) return;
    const event: ScheduleEvent = {
      id: `event-${Date.now()}`,
      title: eventDraft.title.trim(),
      startsAt: makeDateTime(eventDraft.date, eventDraft.startTime),
      endsAt: makeDateTime(eventDraft.date, eventDraft.endTime),
      location: eventDraft.location.trim() || undefined,
      category: eventDraft.category,
      courseId: eventDraft.courseId || undefined,
    };
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ event: ApiStudent["events"][number] }>("/api/events", {
          method: "POST",
          body: JSON.stringify(event),
        });
        setSchedule((items) => [mapEvent(body.event), ...items]);
      } catch {
        setSchedule((items) => [event, ...items]);
        setDataMode("local");
      }
    } else {
      setSchedule((items) => [event, ...items]);
    }
    setEventDraft(defaultEvent);
    setActionNotice(`Added ${event.title} to the calendar.`);
    setView(destination);
  }

  async function updateProfileName(name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    setStudentProfile((profile) => ({ ...profile, name: nextName }));
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ user: ApiStudent }>("/api/me", {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        });
        setStudentProfile({ name: body.user.name, school: body.user.school, year: body.user.year, major: body.user.major, scheduleCategories: parseScheduleCategories(body.user.scheduleCategories) });
      } catch {
        setDataMode("local");
      }
    }
    setActionNotice("Updated your profile name.");
  }

  async function updateScheduleCategories(categories: ScheduleCategory[]) {
    const nextCategories = categories.length ? categories : defaultScheduleCategories;
    setStudentProfile((profile) => ({ ...profile, scheduleCategories: nextCategories }));
    if (!nextCategories.some((category) => category.id === eventDraft.category)) {
      setEventDraft((draft) => ({ ...draft, category: nextCategories[0]?.id ?? "OTHER" }));
    }
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ user: ApiStudent }>("/api/me", {
          method: "PATCH",
          body: JSON.stringify({ scheduleCategories: customOnly(nextCategories) }),
        });
        setStudentProfile({ name: body.user.name, school: body.user.school, year: body.user.year, major: body.user.major, scheduleCategories: parseScheduleCategories(body.user.scheduleCategories) });
      } catch {
        setDataMode("local");
      }
    }
    setActionNotice("Updated schedule categories.");
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, status } : task)));
    if (dataMode === "api") {
      try {
        await apiJson(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      } catch {
        setDataMode("local");
      }
    }
  }

  async function deleteTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    setTasks((items) => items.filter((item) => item.id !== id));
    if (dataMode === "api") {
      try {
        await apiJson(`/api/tasks/${id}`, { method: "DELETE" });
      } catch {
        if (task) setTasks((items) => [task, ...items]);
        setDataMode("local");
        setActionNotice(`Could not delete ${task?.title ?? "task"} from the API. Kept local copy.`);
        return;
      }
    }
    setActionNotice(`Deleted ${task?.title ?? "task"}.`);
  }

  function findOpenFocusSlot(durationMinutes: number) {
    const durationMs = durationMinutes * 60 * 1000;
    const busy = schedule.map((event) => ({ start: parseISO(event.startsAt), end: parseISO(event.endsAt) }));
    const candidate = new Date();
    candidate.setMinutes(candidate.getMinutes() < 30 ? 30 : 60, 0, 0);

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const day = addDays(candidate, dayOffset);
      const searchStart = new Date(day);
      searchStart.setHours(dayOffset === 0 ? Math.max(day.getHours(), 8) : 8, dayOffset === 0 ? day.getMinutes() : 0, 0, 0);
      const latestStart = new Date(day);
      latestStart.setHours(21, 0, 0, 0);

      for (let start = searchStart; start <= latestStart; start = new Date(start.getTime() + 30 * 60 * 1000)) {
        const end = new Date(start.getTime() + durationMs);
        const conflicts = busy.some((slot) => start < slot.end && end > slot.start);
        if (!conflicts) return { startsAt: start, endsAt: end };
      }
    }

    const fallbackStart = candidate;
    return { startsAt: fallbackStart, endsAt: new Date(fallbackStart.getTime() + durationMs) };
  }

  async function scheduleFocusBlock(task: ReturnType<typeof prioritizeTasks>[number]) {
    const duration = Math.min(task.estimatedMinutes, 120);
    const { startsAt, endsAt } = findOpenFocusSlot(duration);
    const event: ScheduleEvent = {
      id: `focus-${Date.now()}`,
      title: `Focus: ${task.title}`,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      location: "Open slot found by Semesterly",
      courseId: task.courseId,
      category: "STUDY",
    };
    if (dataMode === "api") {
      try {
        const body = await apiJson<{ event: ApiStudent["events"][number] }>("/api/events", {
          method: "POST",
          body: JSON.stringify(event),
        });
        setSchedule((items) => [mapEvent(body.event), ...items]);
      } catch {
        setSchedule((items) => [event, ...items]);
        setDataMode("local");
      }
    } else {
      setSchedule((items) => [event, ...items]);
    }
    void updateTaskStatus(task.id, "IN_PROGRESS");
    setActionNotice(`Scheduled ${task.title} for ${format(startsAt, "EEE h:mm a")} in an open slot.`);
    setCalendarMode("day");
    setSelectedDate(startsAt);
    setView("calendar");
  }

  async function snoozeTask(id: string) {
    let nextDueAt: string | null = null;
    setTasks((items) =>
      items.map((task) => {
        if (task.id !== id) return task;
        const next = new Date(task.dueAt);
        next.setDate(next.getDate() + 1);
        nextDueAt = next.toISOString();
        return { ...task, dueAt: next.toISOString() };
      }),
    );
    if (dataMode === "api" && nextDueAt) {
      try {
        await apiJson(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ dueAt: nextDueAt }) });
      } catch {
        setDataMode("local");
      }
    }
  }

  async function loginWithPassword() {
    setAuthNotice(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const loginBody = await response.json().catch(() => ({})) as { user?: { id: string; name: string } ; error?: string };
      if (!response.ok || !loginBody.user?.id) throw new Error(loginBody.error ?? "Login failed");
      const meResponse = await fetch("/api/me");
      const meBody = await meResponse.json().catch(() => ({})) as { user?: ApiStudent; error?: string };
      if (!meResponse.ok || !meBody.user) throw new Error(meBody.error ?? "Could not load session user");
      setUseCookieSession(true);
      setSessionToken(null);
      setStudentId(meBody.user.id);
      applyApiStudent(meBody.user);
      setDataMode("api");
      setLoaded(true);
      window.localStorage.setItem(AUTH_EMAIL_KEY, loginEmail.trim().toLowerCase());
      setAuthNotice(`Signed in as ${loginBody.user.name}.`);
      setActionNotice("Signed in with a secure private account.");
      setView(meBody.user.courses.length ? "dashboard" : "courses");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function createAccount() {
    setAuthNotice(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: signupName, email: loginEmail, password: loginPassword }),
      });
      const registerBody = await response.json().catch(() => ({})) as { user?: { id: string; name: string }; error?: string };
      if (!response.ok || !registerBody.user?.id) throw new Error(registerBody.error ?? "Could not create account");
      const meResponse = await fetch("/api/me");
      const meBody = await meResponse.json().catch(() => ({})) as { user?: ApiStudent; error?: string };
      if (!meResponse.ok || !meBody.user) throw new Error(meBody.error ?? "Could not load new account");
      setUseCookieSession(true);
      setSessionToken(null);
      setStudentId(meBody.user.id);
      applyApiStudent(meBody.user);
      setDataMode("api");
      setLoaded(true);
      window.localStorage.setItem(AUTH_EMAIL_KEY, loginEmail.trim().toLowerCase());
      setAuthNotice(`Created account for ${registerBody.user.name}.`);
      setActionNotice("Private account created. Add your first course to start Semesterly.");
      setView("courses");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Could not create account");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUseCookieSession(false);
    setSessionToken(null);
    setAuthNotice("Signed out. Create or sign in to a private account to continue.");
    await loadStudentWorkspace(defaultStudent.id);
  }

  async function unlockAdmin() {
    try {
      const response = await fetch("/api/auth/demo-session", { method: "POST", headers: { "x-user-id": "dom-admin", "x-admin-token": adminCode.trim() } });
      const body = await response.json().catch(() => ({})) as { token?: string };
      if (!response.ok || !body.token) throw new Error("Admin unlock failed");
      setSessionToken(body.token);
      setAdminUnlocked(true);
      setActionNotice("Admin session verified by the server.");
      setView("admin");
    } catch {
      setAdminUnlocked(false);
      setActionNotice("Admin unlock failed. Check the server admin token.");
    }
  }

  if (!loaded) {
    return <AccountLoading theme={theme} />;
  }

  if (!useCookieSession) {
    return (
      <AccountGate
        theme={theme}
        setTheme={setTheme}
        signupName={signupName}
        setSignupName={setSignupName}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        authNotice={authNotice}
        loginWithPassword={loginWithPassword}
        createAccount={createAccount}
      />
    );
  }

  return (
    <div className={`app-frame ${theme === "dark" ? "theme-dark" : ""}`}>
      <header className="topbar">
        <div className="topbar-left">
          <button className="brand mobile-nav-trigger" type="button" aria-label="Open module menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><span className="brand-mark">S/</span><span className="brand-name">Semesterly</span></button>
          {mobileNavOpen && <button className="mobile-nav-backdrop" type="button" aria-label="Close module menu" onClick={() => setMobileNavOpen(false)} />}
          <nav className="topnav desktop-module-nav" aria-label="Primary navigation">
            {(["dashboard", "calendar", "courses", "profile", ...(adminUnlocked ? ["admin" as View] : [])] as View[]).map((item) => (
              <button className={view === item ? "active" : ""} key={item} onClick={() => setView(item)}>
                {item === "dashboard" ? "Dashboard" : item === "calendar" ? "Calendar" : item === "courses" ? "Courses" : item === "admin" ? "Admin" : "Profile"}
              </button>
            ))}
          </nav>
          <nav className="mobile-module-drawer" data-open={mobileNavOpen ? "true" : "false"} aria-label="Mobile module navigation">
            <strong>Semesterly</strong>
            {(["dashboard", "calendar", "courses", "profile", ...(adminUnlocked ? ["admin" as View] : [])] as View[]).map((item) => (
              <button className={view === item ? "active" : ""} key={item} onClick={() => { setView(item); setMobileNavOpen(false); }}>
                {item === "dashboard" ? "Dashboard" : item === "calendar" ? "Calendar" : item === "courses" ? "Courses" : item === "admin" ? "Admin" : "Profile"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        {actionNotice && <div className="action-notice" role="status"><strong>Done</strong><span>{actionNotice}</span><button aria-label="Dismiss notice" onClick={() => setActionNotice(null)}>×</button></div>}
        <section className="hero-row">
          <div>
            <p className="eyebrow">{format(selectedDate, "EEEE, MMMM d")}</p>
            <h1>{view === "dashboard" ? "Today" : view === "calendar" ? "Calendar" : view === "courses" ? "Courses" : view === "profile" ? "Profile" : "Admin"}</h1>
          </div>
        </section>

        {view === "dashboard" && (
          <section className="dashboard-layout beginner-layout">
            <div className="left-stack main-flow">
              <PriorityCard priorities={priorities} onDone={(id) => updateTaskStatus(id, "DONE")} onStart={(id) => updateTaskStatus(id, "IN_PROGRESS")} onSnooze={snoozeTask} onDelete={deleteTask} />
            </div>

            <div className="right-stack action-rail">
              <ScheduleCard
                schedule={todaysSchedule}
                upcoming={upcomingEvents}
                courses={courses}
                scheduleCategories={scheduleCategories}
                title="Today, in order"
                action={(
                  <AddDropdown
                    courses={courses}
                    selectedCourse={courses.find((course) => course.id === selectedCourseId) ?? courses[0]}
                    taskDraft={taskDraft}
                    setTaskDraft={setTaskDraft}
                    addTask={() => addTask("dashboard")}
                    courseDraft={courseDraft}
                    setCourseDraft={setCourseDraft}
                    addCourse={addCourse}
                    eventDraft={eventDraft}
                    setEventDraft={setEventDraft}
                    addEvent={() => addEvent("dashboard")}
                    smartInput={smartInput}
                    setSmartInput={setSmartInput}
                    scheduleCategories={scheduleCategories}
                    modalLayer
                  />
                )}
              />
              {focusBreaksEnabled && <StudyTimerCard tasks={priorities} breakMinutes={focusBreakMinutes} />}
            </div>
          </section>
        )}

        {view === "courses" && (
          <CoursesPage
            courses={courses}
            tasks={tasks}
            schedule={sortedSchedule}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            addTask={addTask}
            courseDraft={courseDraft}
            setCourseDraft={setCourseDraft}
            addCourse={addCourse}
            eventDraft={eventDraft}
            setEventDraft={setEventDraft}
            addEvent={addEvent}
            updateTaskStatus={updateTaskStatus}
            deleteTask={deleteTask}
            smartInput={smartInput}
            setSmartInput={setSmartInput}
            addSmartTask={addSmartTask}
            scheduleCategories={scheduleCategories}
          />
        )}

        {view === "profile" && (
          <ProfilePage
            student={studentProfile}
            courses={courses}
            tasks={tasks}
            schedule={schedule}
            theme={theme}
            setTheme={setTheme}
            focusBreaksEnabled={focusBreaksEnabled}
            setFocusBreaksEnabled={setFocusBreaksEnabled}
            focusBreakMinutes={focusBreakMinutes}
            setFocusBreakMinutes={setFocusBreakMinutes}
            updateProfileName={updateProfileName}
            logout={logout}
            scheduleCategories={scheduleCategories}
            updateScheduleCategories={updateScheduleCategories}
          />
        )}

        {view === "calendar" && (
          <CalendarPage
            schedule={sortedSchedule}
            courses={courses}
            eventDraft={eventDraft}
            setEventDraft={setEventDraft}
            addEvent={addEvent}
            mode={calendarMode}
            setMode={setCalendarMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            scheduleCategories={scheduleCategories}
          />
        )}

        {view === "admin" && adminUnlocked && (
          <AdminPanel
            adminCode={adminCode}
            setAdminCode={setAdminCode}
            adminUnlocked={adminUnlocked}
            unlock={unlockAdmin}
            selectedStudentId={studentId}
            liveCourses={courses}
            liveTasks={tasks}
            liveSchedule={schedule}
          />
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function AccountLoading({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className={`app-frame account-gate-frame ${theme === "dark" ? "theme-dark" : ""}`}>
      <main className="account-gate loading-gate">
        <section className="card account-card loading-card">
          <div className="brand account-brand"><span className="brand-mark">S</span> Semesterly</div>
          <p className="eyebrow">Checking account</p>
          <h1>Loading your private workspace…</h1>
          <p className="subtitle">If no session exists, Semesterly will ask you to create an account first.</p>
        </section>
      </main>
    </div>
  );
}

function AccountGate({
  theme,
  setTheme,
  signupName,
  setSignupName,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  authNotice,
  loginWithPassword,
  createAccount,
}: {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  signupName: string;
  setSignupName: (name: string) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  authNotice: string | null;
  loginWithPassword: () => void;
  createAccount: () => void;
}) {
  const [authMode, setAuthMode] = useState<"create" | "signin">("create");
  const isSignin = authMode === "signin";

  return (
    <div className={`app-frame account-gate-frame ${theme === "dark" ? "theme-dark" : ""}`}>
      <main className="account-gate">
        <form className="card account-card" aria-label="Sign in or create account" onSubmit={(event) => { event.preventDefault(); void (isSignin ? loginWithPassword() : createAccount()); }}>
          <div className="brand account-brand"><span className="brand-mark">S</span> Semesterly</div>
          <div className="auth-card-copy">
            <p className="eyebrow">Private student workspace</p>
            <h1>{isSignin ? "Sign in" : "Create account"}</h1>
            <p className="subtitle">{isSignin ? "Use your saved email and browser password manager. No create-account fields here." : "Create a private workspace for your courses, assignments, and schedule."}</p>
          </div>
          <div className="auth-mode-tabs" role="tablist" aria-label="Account action">
            <button className={!isSignin ? "active" : ""} type="button" onClick={() => setAuthMode("create")}>Create account</button>
            <button className={isSignin ? "active" : ""} type="button" onClick={() => setAuthMode("signin")}>Sign in</button>
          </div>
          {!isSignin && <label className="setting-row"><span>Name</span><input autoComplete="name" name="name" value={signupName} onChange={(event) => setSignupName(event.target.value)} placeholder="Your name" type="text" /></label>}
          <label className="setting-row"><span>Email</span><input autoComplete="email" name="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@example.com" type="email" /></label>
          <label className="setting-row"><span>Password</span><input autoComplete={isSignin ? "current-password" : "new-password"} name={isSignin ? "current-password" : "new-password"} value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder={isSignin ? "Password" : "At least 8 characters"} type="password" /></label>
          <button className="primary-button" type="submit">{isSignin ? "Sign in" : "Create private account"}</button>
          <button className="ghost-button full-width auth-switch-button" type="button" onClick={() => setAuthMode(isSignin ? "create" : "signin")}>{isSignin ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
          {authNotice && <p className="fine-print">{authNotice}</p>}
        </form>
      </main>
    </div>
  );
}

function ProfilePage({
  student,
  theme,
  setTheme,
  focusBreaksEnabled,
  setFocusBreaksEnabled,
  focusBreakMinutes,
  setFocusBreakMinutes,
  updateProfileName,
  logout,
  scheduleCategories,
  updateScheduleCategories,
}: {
  student: StudentProfile;
  courses: Course[];
  tasks: Task[];
  schedule: ScheduleEvent[];
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  focusBreaksEnabled: boolean;
  setFocusBreaksEnabled: (enabled: boolean) => void;
  focusBreakMinutes: number;
  setFocusBreakMinutes: (minutes: number) => void;
  updateProfileName: (name: string) => void;
  logout: () => void;
  scheduleCategories: ScheduleCategory[];
  updateScheduleCategories: (categories: ScheduleCategory[]) => void;
}) {
  return (
    <section className="profile-page">
      <article className="card profile-hero">
        <div className="profile-avatar">{student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
        <div>
          <h2>{student.name}</h2>
        </div>
      </article>

      <div className="profile-grid lean-profile-grid">
        <div className="profile-stack">
          <article className="card profile-panel">
            <div className="card-title-row"><h2>Name</h2></div>
            <NameEditor name={student.name} onSave={updateProfileName} />
          </article>

          <article className="card profile-panel">
            <div className="card-title-row"><h2>Account</h2></div>
            <button className="ghost-button full-width" onClick={logout}>Sign out</button>
          </article>

          <CategoryEditor categories={scheduleCategories} onSave={updateScheduleCategories} />
        </div>

        <article className="card profile-panel">
          <div className="card-title-row"><h2>Preferences</h2></div>
          <label className="setting-row"><span>Theme</span><select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")}><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label className="setting-row checkbox-row"><span>Show break timer</span><input checked={focusBreaksEnabled} onChange={(event) => setFocusBreaksEnabled(event.target.checked)} type="checkbox" /></label>
          {focusBreaksEnabled && <label className="setting-row"><span>Break length</span><input min="1" max="30" value={focusBreakMinutes} onChange={(event) => setFocusBreakMinutes(Math.min(30, Math.max(1, Number(event.target.value) || 5)))} type="number" /></label>}
          <label className="setting-row"><span>Reminder style</span><select defaultValue="balanced"><option value="quiet">Quiet</option><option value="balanced">Balanced</option><option value="urgent">Urgent</option></select></label>
          <label className="setting-row"><span>Best focus window</span><select defaultValue="evening"><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label>
        </article>
      </div>
    </section>
  );
}

function NameEditor({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const changed = draft.trim() && draft.trim() !== name;
  return (
    <div className="name-editor">
      <label className="setting-row"><span>Name</span><input value={draft} onChange={(event) => setDraft(event.target.value)} type="text" /></label>
      <button className="ghost-button full-width" disabled={!changed} onClick={() => onSave(draft)}>Save name</button>
    </div>
  );
}

function CategoryEditor({ categories, onSave }: { categories: ScheduleCategory[]; onSave: (categories: ScheduleCategory[]) => void }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#1a73e8");
  const custom = customOnly(categories);

  function addCategory() {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    const id = categoryId(nextLabel);
    const withoutDuplicate = categories.filter((item) => item.id !== id);
    onSave([...withoutDuplicate, { id, label: nextLabel, color }]);
    setLabel("");
  }

  function removeCategory(id: string) {
    onSave(categories.filter((item) => item.id !== id));
  }

  return (
    <article className="card profile-panel category-editor">
      <div className="card-title-row"><h2>Schedule categories</h2></div>
      <p className="muted-copy">Create your own labels for calendar items.</p>
      <div className="category-chip-list">
        {categories.map((category) => (
          <span className="category-chip" key={category.id} style={{ borderColor: category.color }}>
            <i style={{ background: category.color }} />{category.label}
            {custom.some((item) => item.id === category.id) && <button type="button" aria-label={`Remove ${category.label}`} onClick={() => removeCategory(category.id)}>×</button>}
          </span>
        ))}
      </div>
      <div className="category-add-row">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Lab, Gym, Office hours…" />
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Category color" />
        <button className="ghost-button" type="button" onClick={addCategory}>Add</button>
      </div>
    </article>
  );
}

function AddDropdown({
  courses,
  selectedCourse,
  taskDraft,
  setTaskDraft,
  addTask,
  courseDraft,
  setCourseDraft,
  addCourse,
  eventDraft,
  setEventDraft,
  addEvent,
  smartInput,
  setSmartInput,
  scheduleCategories,
  modalLayer = false,
}: {
  courses: Course[];
  selectedCourse?: Course;
  taskDraft: DraftTask;
  setTaskDraft: (draft: DraftTask) => void;
  addTask: () => void;
  courseDraft: DraftCourse;
  setCourseDraft: (draft: DraftCourse) => void;
  addCourse: () => void;
  eventDraft: DraftEvent;
  setEventDraft: (draft: DraftEvent) => void;
  addEvent: () => void;
  smartInput: string;
  setSmartInput: (value: string) => void;
  scheduleCategories: ScheduleCategory[];
  modalLayer?: boolean;
}) {
  const [addPanel, setAddPanel] = useState<"course" | "assignment" | "exam" | "event">("course");
  const [addOpen, setAddOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const menu = (
    <div className="add-menu add-menu-with-tools" role="dialog" aria-label="Add to Semesterly">
      <div className="add-tabs">
        {(["course", "assignment", "exam", "event"] as const).map((item) => <button type="button" key={item} className={addPanel === item ? "active" : ""} onClick={() => {
          setAddPanel(item);
          if (item === "assignment" || item === "exam") setTaskDraft({ ...taskDraft, courseId: selectedCourse?.id ?? taskDraft.courseId, title: item === "exam" ? "Exam" : taskDraft.title, importance: item === "exam" ? 5 : taskDraft.importance, estimatedMinutes: item === "exam" ? 180 : taskDraft.estimatedMinutes });
          if (item === "event") setEventDraft({ ...eventDraft, title: selectedCourse ? `${selectedCourse.code} class` : eventDraft.title, category: "CLASS", courseId: selectedCourse?.id ?? eventDraft.courseId });
        }}>{item === "event" ? "Calendar" : item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      {addPanel === "course" && <CourseForm courseDraft={courseDraft} setCourseDraft={setCourseDraft} addCourse={addCourse} />}
      {addPanel === "assignment" && <TaskForm taskDraft={taskDraft} setTaskDraft={setTaskDraft} addTask={addTask} courses={courses} />}
      {addPanel === "exam" && <TaskForm taskDraft={{ ...taskDraft, title: taskDraft.title || "Exam", importance: 5, estimatedMinutes: Math.max(taskDraft.estimatedMinutes, 180), courseId: taskDraft.courseId || selectedCourse?.id || "" }} setTaskDraft={setTaskDraft} addTask={addTask} courses={courses} />}
      {addPanel === "event" && <EventForm eventDraft={eventDraft} setEventDraft={setEventDraft} addEvent={addEvent} courses={courses} scheduleCategories={scheduleCategories} />}
      <div className="add-menu-tools single-tool">
        <SmartCaptureCard value={smartInput} setValue={setSmartInput} />
      </div>
    </div>
  );

  if (!modalLayer) {
    return (
      <div className="add-dropdown centered-add-modal" data-open={addOpen ? "true" : "false"}>
        <button className="add-trigger" type="button" aria-haspopup="dialog" aria-expanded={addOpen} onClick={() => setAddOpen((open) => !open)}>Add</button>
        {mounted && addOpen && createPortal(
          <div className="add-portal" data-open="true">
            <button className="add-overlay" aria-label="Close add menu" type="button" onClick={() => setAddOpen(false)} />
            {menu}
          </div>,
          document.body,
        )}
      </div>
    );
  }

  return (
    <div className="add-dropdown courses-add-modal" data-open={addOpen ? "true" : "false"}>
      <button className="add-trigger" type="button" aria-haspopup="dialog" aria-expanded={addOpen} onClick={() => setAddOpen((open) => !open)}>Add</button>
      {mounted && addOpen && createPortal(
        <div className="add-portal" data-open="true">
          <button className="add-overlay" aria-label="Close add menu" type="button" onClick={() => setAddOpen(false)} />
          {menu}
        </div>,
        document.body,
      )}
    </div>
  );
}

function CoursesPage({
  courses,
  tasks,
  schedule,
  selectedCourseId,
  setSelectedCourseId,
  taskDraft,
  setTaskDraft,
  addTask,
  courseDraft,
  setCourseDraft,
  addCourse,
  eventDraft,
  setEventDraft,
  addEvent,
  updateTaskStatus,
  deleteTask,
  smartInput,
  setSmartInput,
  addSmartTask,
  scheduleCategories,
}: {
  courses: Course[];
  tasks: Task[];
  schedule: ScheduleEvent[];
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string) => void;
  taskDraft: DraftTask;
  setTaskDraft: (draft: DraftTask) => void;
  addTask: (destination?: View) => void;
  courseDraft: DraftCourse;
  setCourseDraft: (draft: DraftCourse) => void;
  addCourse: () => void;
  eventDraft: DraftEvent;
  setEventDraft: (draft: DraftEvent) => void;
  addEvent: (destination?: View) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  smartInput: string;
  setSmartInput: (value: string) => void;
  addSmartTask: () => void;
  scheduleCategories: ScheduleCategory[];
}) {
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0];
  const courseTasks = selectedCourse ? tasks.filter((task) => task.courseId === selectedCourse.id) : [];
  const courseEvents = selectedCourse
    ? [
        ...schedule.filter((event) => event.courseId === selectedCourse.id),
        ...courseTasks.slice(0, 3).map((task) => ({
          id: `cal-${task.id}`,
          title: task.title,
          startsAt: task.dueAt,
          endsAt: task.dueAt,
          location: "Due date",
          courseId: selectedCourse.id,
          category: "STUDY" as ScheduleEvent["category"],
        })),
      ].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : [];
  const openTasks = courseTasks.filter((task) => task.status !== "DONE");
  const doneTasks = courseTasks.filter((task) => task.status === "DONE");
  const workload = openTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const exams = courseTasks.filter((task) => /exam|midterm|final|quiz|test/i.test(task.title));
  const generatedExamDate = new Date();
  generatedExamDate.setDate(generatedExamDate.getDate() + 21);
  const courseSummaries = courses
    .map((course) => {
      const open = tasks.filter((task) => task.courseId === course.id && task.status !== "DONE");
      const minutes = open.reduce((sum, task) => sum + task.estimatedMinutes, 0);
      const nextTask = open.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      const urgent = open.filter((task) => differenceInCalendarDays(parseISO(task.dueAt), new Date()) <= 3).length;
      const score = urgent * 3 + Math.ceil(minutes / 60) + course.importance;
      return { course, open, minutes, nextTask, urgent, score };
    })
    .sort((a, b) => b.score - a.score);
  const highestRisk = courseSummaries[0];

  return (
    <section className="courses-page">
      <article className="card course-risk-strip course-action-strip">
        <div>
          <h2>{highestRisk ? highestRisk.course.code : "Courses"}</h2>
          <p>{highestRisk?.nextTask ? highestRisk.nextTask.title : "No open work"}</p>
        </div>
        <div className="course-action-buttons">
          <AddDropdown
            courses={courses}
            selectedCourse={selectedCourse}
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            addTask={() => addTask("courses")}
            courseDraft={courseDraft}
            setCourseDraft={setCourseDraft}
            addCourse={addCourse}
            eventDraft={eventDraft}
            setEventDraft={setEventDraft}
            addEvent={() => addEvent("courses")}
            smartInput={smartInput}
            setSmartInput={setSmartInput}
            scheduleCategories={scheduleCategories}
            modalLayer
          />
        </div>
      </article>

      <section className="courses-layout">
        <aside className="course-sidebar">
          {courses.map((course) => {
            const open = tasks.filter((task) => task.courseId === course.id && task.status !== "DONE").length;
            return (
              <button className={selectedCourse?.id === course.id ? "course-select active" : "course-select"} key={course.id} onClick={() => setSelectedCourseId(course.id)}>
                <span className="color-dot" style={{ background: course.color }} />
                <strong>{course.code}</strong>
                <small>{course.name} · {open} open</small>
              </button>
            );
          })}
        </aside>

        {selectedCourse && (
          <div className="course-detail">
            <article className="card course-detail-hero">
              <div>
                <p className="eyebrow">{selectedCourse.code}</p>
                <h2>{selectedCourse.name}</h2>
                <p>Importance {selectedCourse.importance}/5 · {minutesLabel(workload)} open workload · {courseEvents.length} calendar items</p>
                {selectedCourse.location && <a className="map-link" href={mapLink(selectedCourse.location)} target="_blank" rel="noreferrer">Open {selectedCourse.location} in Maps</a>}
              </div>
              <div className="metrics-row">
                <Metric label="Open" value={openTasks.length} />
                <Metric label="Done" value={doneTasks.length} />
                <Metric label="Exams" value={exams.length || 1} />
                <Metric label="Priority" value={`${selectedCourse.importance}/5`} />
              </div>
            </article>

            <div className="course-subgrid">
              <article className="card">
                <div className="card-title-row"><h2>Course calendar</h2></div>
                <CalendarAgenda events={courseEvents} courses={courses} scheduleCategories={scheduleCategories} />
              </article>

              <article className="card">
                <div className="card-title-row"><h2>Assignments</h2></div>
                <div className="list-stack">
                  {courseTasks.map((task) => <div className="assignment-row" key={task.id}><div><strong>{task.title}</strong><span>{format(parseISO(task.dueAt), "MMM d, h:mm a")} · {minutesLabel(task.estimatedMinutes)} · {statusLabel(task.status)}</span></div><div className="assignment-actions"><button onClick={() => updateTaskStatus(task.id, task.status === "DONE" ? "NOT_STARTED" : "DONE")}>{task.status === "DONE" ? "Reopen" : "Done"}</button><button className="danger-link" onClick={() => deleteTask(task.id)}>Delete</button></div></div>)}
                  {!courseTasks.length && <p className="empty">No assignments yet.</p>}
                </div>
              </article>

              <article className="card">
                <div className="card-title-row"><h2>Exams & quizzes</h2></div>
                <div className="list-stack">
                  {(exams.length ? exams : [{ id: `${selectedCourse.id}-generated-exam`, title: `${selectedCourse.code} checkpoint exam`, dueAt: generatedExamDate.toISOString(), estimatedMinutes: 180, importance: 5, status: "NOT_STARTED" as TaskStatus }]).map((exam) => (
                    <div className="assignment-row" key={exam.id}><div><strong>{exam.title}</strong><span>{format(parseISO(exam.dueAt), "MMM d")} · study target {minutesLabel(exam.estimatedMinutes)}</span></div></div>
                  ))}
                </div>
              </article>

              <article className="card">
                <div className="card-title-row"><h2>Extra course data</h2></div>
                <ul className="trust-list roomy">
                  <li><strong>Recommended pace</strong><span>{openTasks.length ? `${Math.max(1, Math.ceil(workload / 60 / 5))} focused sessions this week` : "Maintain notes and review before class."}</span></li>
                  <li><strong>Risk signal</strong><span>{openTasks.some((task) => differenceInCalendarDays(parseISO(task.dueAt), new Date()) <= 2) ? "Due soon — prioritize this course." : "Stable — no immediate deadline spike."}</span></li>
                  <li><strong>Next action</strong><span>{openTasks[0] ? `Start ${openTasks[0].title}.` : "Add upcoming work or exam dates."}</span></li>
                </ul>
              </article>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

function CalendarPage({
  schedule,
  courses,
  eventDraft,
  setEventDraft,
  addEvent,
  mode,
  setMode,
  selectedDate,
  setSelectedDate,
  scheduleCategories,
}: {
  schedule: ScheduleEvent[];
  courses: Course[];
  eventDraft: DraftEvent;
  setEventDraft: (draft: DraftEvent) => void;
  addEvent: (destination?: View) => void;
  mode: CalendarMode;
  setMode: (mode: CalendarMode) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date | ((date: Date) => Date)) => void;
  scheduleCategories: ScheduleCategory[];
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthGridStart = startOfWeek(monthStart);
  const monthGridEnd = endOfWeek(endOfMonth(selectedDate));
  const monthDays = [];
  for (let date = monthGridStart; date <= monthGridEnd; date = addDays(date, 1)) monthDays.push(date);

  const visibleDays = mode === "day"
    ? [selectedDate]
    : mode === "week"
      ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index))
      : monthDays;

  const visibleEvents = mode === "semester"
    ? schedule
    : schedule.filter((event) => visibleDays.some((day) => isSameDay(parseISO(event.startsAt), day)));

  return (
    <section className="calendar-page">
      <article className="card calendar-hero">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>{mode === "semester" ? `${format(selectedDate, "MMM yyyy")} semester` : format(selectedDate, mode === "month" ? "MMMM yyyy" : "EEEE, MMMM d")}</h2>
        </div>
        <div className="calendar-controls">
          <div className="calendar-tabs" role="tablist" aria-label="Calendar view">
            {(["day", "week", "month", "semester"] as CalendarMode[]).map((item) => (
              <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
            ))}
          </div>
        </div>
      </article>

      {mode === "semester" ? (
        <section className="calendar-semester">
          <article className="card">
            <div className="card-title-row"><h2>Full semester</h2></div>
            <CalendarAgenda events={schedule} courses={courses} groupByMonth scheduleCategories={scheduleCategories} />
          </article>
        </section>
      ) : (
        <section className={mode === "day" ? "calendar-layout day" : "calendar-layout"}>
          <article className="card calendar-board">
            {mode === "day" && (
              <div className="calendar-day-controls" aria-label="Day navigation">
                <button onClick={() => setSelectedDate((date) => addDays(date, -1))}>Back</button>
                <button onClick={() => setSelectedDate((date) => addDays(date, 1))}>Next</button>
              </div>
            )}
            <div className="calendar-grid-head">
              {(mode === "day" ? [selectedDate] : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index))).map((day) => (
                <div key={day.toISOString()}>{format(day, "EEE")}</div>
              ))}
            </div>
            <div className={`calendar-grid ${mode}`}>
              {visibleDays.map((day) => {
                const dayEvents = schedule.filter((event) => isSameDay(parseISO(event.startsAt), day));
                return (
                  <div className={`calendar-cell ${isToday(day) ? "today" : ""} ${mode === "month" && !isSameMonth(day, selectedDate) ? "muted" : ""}`} key={day.toISOString()} onClick={() => setSelectedDate(day)}>
                    <div className="calendar-date"><strong>{format(day, "d")}</strong><span>{format(day, "MMM")}</span></div>
                    <div className="calendar-events">
                      {dayEvents.map((event) => {
                        return (
                          <div className="calendar-event" key={event.id}>
                            <span className="event-color" style={{ background: eventCategoryColor(event.category, scheduleCategories) }} />
                            <div><strong>{event.title}</strong><p>{format(parseISO(event.startsAt), "h:mm a")} · {event.location ? <a className="inline-map-link" href={mapLink(event.location)} target="_blank" rel="noreferrer">{event.location}</a> : eventCategoryLabel(event.category, scheduleCategories)}</p></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <div className="right-stack calendar-form-stack">
            <EventForm eventDraft={eventDraft} setEventDraft={setEventDraft} addEvent={addEvent} courses={courses} scheduleCategories={scheduleCategories} />
          </div>
        </section>
      )}
    </section>
  );
}

function CalendarAgenda({ events, courses: _courses, groupByMonth = false, scheduleCategories = defaultScheduleCategories }: { events: ScheduleEvent[]; courses: Course[]; groupByMonth?: boolean; scheduleCategories?: ScheduleCategory[] }) {
  if (!events.length) return <p className="empty">No calendar items in this view.</p>;
  let lastGroup = "";
  return (
    <div className="calendar-agenda">
      {events.map((event) => {
        const startsAt = parseISO(event.startsAt);
        const group = format(startsAt, "MMMM yyyy");
        const showGroup = groupByMonth && group !== lastGroup;
        lastGroup = group;
        return (
          <div key={event.id}>
            {showGroup && <h3 className="agenda-month">{group}</h3>}
            <div className="agenda-row">
              <span className="event-color" style={{ background: eventCategoryColor(event.category, scheduleCategories) }} />
              <div>
                <strong>{event.title}</strong>
                <p>{format(startsAt, "EEE, MMM d · h:mm a")}–{format(parseISO(event.endsAt), "h:mm a")} · {event.location ? <a className="inline-map-link" href={mapLink(event.location)} target="_blank" rel="noreferrer">{event.location}</a> : eventCategoryLabel(event.category, scheduleCategories)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightsPage({
  courses,
  tasks,
  priorities,
  courseLoads,
  weekMinutes,
}: {
  courses: Course[];
  tasks: Task[];
  priorities: ReturnType<typeof prioritizeTasks>;
  courseLoads: { course: Course; minutes: number; open: number }[];
  weekMinutes: number;
}) {
  const openTasks = tasks.filter((task) => task.status !== "DONE");
  const doneTasks = tasks.filter((task) => task.status === "DONE");
  const completion = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const highRisk = openTasks.filter((task) => differenceInCalendarDays(parseISO(task.dueAt), new Date()) <= 1).length;
  const hardestCourse = courseLoads[0];

  return (
    <section className="insights-page">
      <article className="card insights-hero">
        <div>
          <p className="eyebrow">Command center</p>
          <h2>{highRisk ? `${highRisk} thing${highRisk === 1 ? "" : "s"} need attention.` : "No urgent fires."}</h2>
          <p>{hardestCourse ? `${hardestCourse.course.code} has the heaviest load right now.` : "Add classes and assignments to generate insights."}</p>
        </div>
        <div className="metrics-row">
          <Metric label="Completion" value={`${completion}%`} />
          <Metric label="Open" value={openTasks.length} />
          <Metric label="Workload" value={minutesLabel(weekMinutes)} />
          <Metric label="Courses" value={courses.length} />
        </div>
      </article>

      <div className="insights-grid">
        <article className="card">
          <div className="card-title-row"><h2>Course load</h2></div>
          <div className="load-list">
            {courseLoads.map(({ course, minutes, open }) => (
              <div key={course.id}>
                <div className="load-row"><strong>{course.code}</strong><span>{minutesLabel(minutes)} · {open} open</span></div>
                <div className="load-bar"><span style={{ width: `${Math.min(100, (minutes / Math.max(weekMinutes, 1)) * 100)}%`, background: course.color }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-title-row"><h2>At risk</h2></div>
          <div className="risk-list big">
            {openTasks.filter((task) => differenceInCalendarDays(parseISO(task.dueAt), new Date()) <= 2).slice(0, 6).map((task) => (
              <div key={task.id}><strong>{task.title}</strong><span>{format(parseISO(task.dueAt), "EEE h:mm a")} · {minutesLabel(task.estimatedMinutes)}</span></div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-title-row"><h2>Best next moves</h2></div>
          <ol className="focus-plan">
            {priorities.slice(0, 5).map((task) => <li key={task.id}><strong>{task.title}</strong><span>{task.reason}</span></li>)}
          </ol>
        </article>
      </div>
    </section>
  );
}

function TrustCenter({
  selectedStudent,
  courses,
  tasks,
  schedule,
  onClear,
}: {
  selectedStudent: string;
  courses: Course[];
  tasks: Task[];
  schedule: ScheduleEvent[];
  onClear: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const deleteReady = deleteConfirm.trim().toUpperCase() === "DELETE";

  function exportData() {
    const blob = new Blob([JSON.stringify({ selectedStudent, courses, tasks, schedule, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedStudent.toLowerCase().replace(/\s+/g, "-")}-semesterly-export.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="trust-center">
      <article className="card trust-hero">
        <div>
          <p className="eyebrow">Trust center</p>
          <h2>Your data stays yours.</h2>
          <p>Semesterly should feel safe before it feels smart.</p>
        </div>
        <div className="trust-actions">
          <button onClick={exportData}>Export {selectedStudent}'s data</button>
          <button onClick={onClear}>Clear imported data</button>
          <div className="delete-confirm-box">
            <label>
              Type DELETE to enable account deletion
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="DELETE" />
            </label>
            <button className="danger-button" disabled={!deleteReady} onClick={onClear}>Delete account demo</button>
          </div>
        </div>
      </article>

      <div className="trust-grid">
        <article className="card">
          <div className="card-title-row"><h2>What users see</h2></div>
          <ul className="trust-list roomy">
            <li><strong>Own data only</strong><span>Students can only access their own courses, assignments, and events.</span></li>
            <li><strong>Clear rankings</strong><span>Every priority explains the reason.</span></li>
            <li><strong>Easy controls</strong><span>Export and delete paths are part of the product.</span></li>
          </ul>
        </article>

        <article className="card">
          <div className="card-title-row"><h2>What admin sees</h2></div>
          <ul className="trust-list roomy">
            <li><strong>All user data</strong><span>Admin can review schools, classes, assignments, and events.</span></li>
            <li><strong>Server protection</strong><span>Admin API requires an environment token now, real roles later.</span></li>
            <li><strong>Audit trail</strong><span>Admin views create audit log records.</span></li>
          </ul>
        </article>

        <article className="card">
          <div className="card-title-row"><h2>Production checklist</h2></div>
          <ul className="check-list">
            <li>Real login</li>
            <li>Admin role checks</li>
            <li>Hosted database backups</li>
            <li>Privacy policy</li>
            <li>Data export/delete UI wired to API</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function AdminPanel({
  adminCode,
  setAdminCode,
  adminUnlocked,
  unlock,
  selectedStudentId,
  liveCourses,
  liveTasks,
  liveSchedule,
}: {
  adminCode: string;
  setAdminCode: (code: string) => void;
  adminUnlocked: boolean;
  unlock: () => void;
  selectedStudentId: string;
  liveCourses: Course[];
  liveTasks: Task[];
  liveSchedule: ScheduleEvent[];
}) {
  if (!adminUnlocked) {
    return (
      <section className="admin-lock">
        <article className="card admin-card">
          <p className="eyebrow">Admin only</p>
          <h2>User data is restricted</h2>
          <p className="subtitle">Only the administrator can view all student records.</p>
          <div className="admin-form">
            <input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} placeholder="Demo admin code" type="password" />
            <button className="primary-button" onClick={unlock}>Unlock admin</button>
          </div>
          <p className="fine-print">Production needs server-side auth, admin roles, and audit logs.</p>
        </article>
      </section>
    );
  }

  const rows = allSampleStudents.map((student) => {
    if (student.id !== selectedStudentId) return student;
    return { ...student, courses: liveCourses, tasks: liveTasks, schedule: liveSchedule };
  });
  const totalAssignments = rows.reduce((sum, student) => sum + student.tasks.length, 0);
  const totalCourses = rows.reduce((sum, student) => sum + student.courses.length, 0);

  return (
    <section className="admin-page">
      <article className="card admin-summary">
        <div>
          <p className="eyebrow">Administrator view</p>
          <h2>All users and inputted data</h2>
          <p>Restricted view for Dom only.</p>
        </div>
        <div className="metrics-row">
          <Metric label="Users" value={rows.length} />
          <Metric label="Courses" value={totalCourses} />
          <Metric label="Assignments" value={totalAssignments} />
        </div>
      </article>

      <div className="admin-grid">
        {rows.map((student) => (
          <article className="card admin-user-card" key={student.id}>
            <div className="card-title-row">
              <h2>{student.name}</h2></div>
            <p className="admin-meta">{student.school} · {student.major}</p>
            <div className="admin-section">
              <strong>Classes</strong>
              {student.courses.map((course) => <p key={course.id}>{course.code} — {course.name}</p>)}
            </div>
            <div className="admin-section">
              <strong>Assignments</strong>
              {student.tasks.map((task) => <p key={task.id}>{task.title} · {statusLabel(task.status)} · {minutesLabel(task.estimatedMinutes)}</p>)}
            </div>
            <div className="admin-section">
              <strong>Events</strong>
              {student.schedule.map((event) => <p key={event.id}>{event.title} · {format(parseISO(event.startsAt), "EEE h:mm a")}</p>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


function DueSoonCard({ tasks, courses }: { tasks: Task[]; courses: Course[] }) {
  return (
    <article className="card compact-card">
      <div className="card-title-row"><h2>Due soon</h2></div>
      <div className="due-list">
        {tasks.map((task) => {
          const course = courses.find((item) => item.id === task.courseId);
          const days = differenceInCalendarDays(parseISO(task.dueAt), new Date());
          const label = days < 0 ? "Overdue" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
          return (
            <div className="due-row" key={task.id}>
              <span className="color-dot" style={{ background: course?.color ?? "#1a73e8" }} />
              <div><strong>{task.title}</strong><p>{course?.code ?? "Personal"} · {label}</p></div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function FocusPlanCard({ tasks }: { tasks: ReturnType<typeof prioritizeTasks> }) {
  return (
    <article className="card compact-card">
      <div className="card-title-row"><h2>Suggested focus plan</h2></div>
      <ol className="focus-plan">
        {tasks.map((task) => <li key={task.id}><strong>{task.title}</strong><span>{minutesLabel(task.estimatedMinutes)} · {task.course?.code ?? "Personal"}</span></li>)}
      </ol>
    </article>
  );
}

function CoachCard({ recommendations }: { recommendations: ReturnType<typeof buildRecommendations> }) {
  return (
    <article className="card compact-card coach-card">
      <div className="card-title-row"><h2>Semesterly coach</h2></div>
      <div className="coach-list">
        {recommendations.map((item) => (
          <div className={`coach-item ${item.tone}`} key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function BreakStatusCard({ minutes }: { minutes: number }) {
  return (
    <article className="card compact-card break-status-card">
      <div className="card-title-row"><h2>Breaks enabled</h2></div>
      <p>Focus timer will include a {minutes}-minute break option.</p>
    </article>
  );
}

function RiskCard({ tasks, courses }: { tasks: Task[]; courses: Course[] }) {
  const risky = tasks
    .map((task) => ({ task, days: differenceInCalendarDays(parseISO(task.dueAt), new Date()), course: courses.find((course) => course.id === task.courseId) }))
    .filter((item) => item.days <= 2 && item.task.status !== "DONE")
    .slice(0, 3);

  return (
    <article className="card compact-card risk-card">
      <div className="card-title-row"><h2>Risk watch</h2></div>
      {risky.length === 0 ? <p className="empty">No urgent risks.</p> : (
        <div className="risk-list">
          {risky.map(({ task, days, course }) => <div key={task.id}><strong>{task.title}</strong><span>{course?.code ?? "Personal"} · {days <= 0 ? "due now" : `${days} day${days === 1 ? "" : "s"}`} · {minutesLabel(task.estimatedMinutes)}</span></div>)}
        </div>
      )}
    </article>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function StudyTimerCard({ tasks, breakMinutes }: { tasks: ReturnType<typeof prioritizeTasks>; breakMinutes: number }) {
  const safeBreakMinutes = Math.min(30, Math.max(1, breakMinutes));
  const presets = {
    focus25: { label: "25 min", seconds: 25 * 60, copy: "Short focus sprint." },
    focus50: { label: "50 min", seconds: 50 * 60, copy: "Deep work block." },
    breakCustom: { label: `${safeBreakMinutes} min break`, seconds: safeBreakMinutes * 60, copy: "Optional reset before the next block." },
  };
  const [mode, setMode] = useState<keyof typeof presets>("focus25");
  const [secondsLeft, setSecondsLeft] = useState(presets.focus25.seconds);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? "");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const minutesDraft = Math.max(1, Math.round(secondsLeft / 60));

  useEffect(() => {
    if (!tasks.length) {
      setSelectedTaskId("");
      return;
    }
    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) setSelectedTaskId(tasks[0].id);
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      playTimerAlarm();
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, secondsLeft]);

  function chooseMode(nextMode: keyof typeof presets) {
    setMode(nextMode);
    setSecondsLeft(presets[nextMode].seconds);
    setRunning(false);
  }

  function setMinutes(minutes: number) {
    const safeMinutes = Math.min(240, Math.max(1, Math.round(minutes || 1)));
    setSecondsLeft(safeMinutes * 60);
    setRunning(false);
  }

  return (
    <article className="card compact-card focus-timer-card">
      <div className="card-title-row"><h2>Focus timer</h2></div>
      <div className="timer-task">
        <span>Working on</span>
        {tasks.length ? (
          <select value={selectedTask?.id ?? ""} onChange={(event) => setSelectedTaskId(event.target.value)}>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        ) : <strong>No priority task yet</strong>}
      </div>
      <label className="timer-input"><span>Minutes</span><input min="1" max="240" value={minutesDraft} onChange={(event) => setMinutes(Number(event.target.value))} type="number" /></label>
      <div className={running ? "timer-face active" : "timer-face"}>{formatTimer(secondsLeft)}</div>
      <p className="timer-copy">{selectedTask ? `${presets[mode].copy} ${selectedTask.title} is queued. Alarm plays when time is up.` : "Add an assignment to connect the timer to real work."}</p>
      <div className="timer-buttons">
        {(Object.keys(presets) as Array<keyof typeof presets>).map((preset) => <button className={mode === preset ? "active" : ""} key={preset} onClick={() => chooseMode(preset)}>{presets[preset].label}</button>)}
      </div>
      <div className="timer-controls">
        <button className="primary-button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Start focus"}</button>
        <button onClick={() => { setSecondsLeft(presets[mode].seconds); setRunning(false); }}>Reset</button>
      </div>
      <p className="timer-footnote">Timers continue while the app stays open. True closed-app/device-off alarms need mobile OS notification support.</p>
    </article>
  );
}

function playTimerAlarm() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    gain.connect(context.destination);
    [0, 0.22, 0.44].forEach((offset) => {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = 880;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.14);
    });
  } catch {
    // Browser audio permissions may block alarm playback until the user interacts.
  }
}

function SmartCaptureCard({ value, setValue }: { value: string; setValue: (value: string) => void }) {
  return (
    <article className="card compact-card capture-card upload-capture-card">
      <div className="card-title-row"><h2>Smart capture</h2></div>
      <p>Upload a syllabus or schedule screenshot.</p>
      <label className="file-upload-control">
        <span>{value || "Choose screenshot"}</span>
        <input
          accept="image/*,.pdf"
          type="file"
          onChange={(event) => setValue(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      <p className="upload-note">Review before saving.</p>
    </article>
  );
}

function PriorityCard({ priorities, onDone, onStart, onSnooze, onDelete }: { priorities: ReturnType<typeof prioritizeTasks>; onDone: (id: string) => void; onStart: (id: string) => void; onSnooze: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <article className="card priority-card">
      <div className="card-title-row"><h2>Priority queue</h2></div>
      <div className="priority-list">
        {priorities.length === 0 && <p className="empty">Nothing active. Add an assignment to generate priorities.</p>}
        {priorities.map((task, index) => (
          <div className="priority-item" key={task.id}>
            <div className="rank">{index + 1}</div>
            <div className="priority-body">
              <div className="priority-topline">
                <p className="item-title">{task.title}</p>
                <span className="score">{task.score}</span>
              </div>
              <p className="meta">{task.course?.code ?? "Personal"} · due {format(parseISO(task.dueAt), "EEE h:mm a")} · {minutesLabel(task.estimatedMinutes)} · {statusLabel(task.status)}</p>
              <p className="reason">{task.reason}</p>
              <div className="action-row">
                <button onClick={() => onStart(task.id)}>Start</button>
                <button onClick={() => onDone(task.id)}>Done</button>
                <button onClick={() => onSnooze(task.id)}>Snooze 1 day</button>
                <button className="danger-link" onClick={() => onDelete(task.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ScheduleCard({ schedule, upcoming = [], courses: _courses, scheduleCategories = defaultScheduleCategories, title = "Today’s schedule", action }: { schedule: ScheduleEvent[]; upcoming?: ScheduleEvent[]; courses: Course[]; scheduleCategories?: ScheduleCategory[]; title?: string; action?: ReactNode }) {
  return (
    <article className="card schedule-card merged-schedule-card">
      <div className="card-title-row schedule-title-row">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="timeline">
        {schedule.length === 0 && <p className="empty">No events today.</p>}
        {schedule.map((event) => {
          return (
            <div className="timeline-row" key={event.id}>
              <div className="time">{format(parseISO(event.startsAt), "h:mm a")}</div>
              <div className="event-card">
                <span className="event-color" style={{ background: eventCategoryColor(event.category, scheduleCategories) }} />
                <div><strong>{event.title}</strong><p>{event.location ? <a className="inline-map-link" href={mapLink(event.location)} target="_blank" rel="noreferrer">{event.location}</a> : eventCategoryLabel(event.category, scheduleCategories)} · until {format(parseISO(event.endsAt), "h:mm a")}</p></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="schedule-upcoming-section">
        <h3>Upcoming calendar events</h3>
        <div className="calendar-agenda compact-agenda">
          {upcoming.length === 0 && <p className="empty">No upcoming calendar events.</p>}
          {upcoming.map((event) => (
            <div className="agenda-row" key={event.id}>
              <span className="event-color" style={{ background: eventCategoryColor(event.category, scheduleCategories) }} />
              <div>
                <strong>{event.title}</strong>
                <p>{format(parseISO(event.startsAt), "EEE, MMM d · h:mm a")}–{format(parseISO(event.endsAt), "h:mm a")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}


function TrustCard() {
  return (
    <article className="card compact-card trust-card">
      <div className="card-title-row"><h2>Trust</h2></div>
      <ul className="trust-list">
        <li><strong>Private by default</strong><span>This demo stores data only in this browser.</span></li>
        <li><strong>Clear priorities</strong><span>Every ranking shows why.</span></li>
        <li><strong>User control</strong><span>Start, finish, snooze, or reset anytime.</span></li>
      </ul>
    </article>
  );
}
function QuickAdd({ taskDraft, setTaskDraft, addTask, courses }: { taskDraft: DraftTask; setTaskDraft: (draft: DraftTask) => void; addTask: () => void; courses: Course[] }) {
  return (
    <article className="card">
      <div className="card-title-row"><h2>Quick add</h2></div>
      <TaskFields taskDraft={taskDraft} setTaskDraft={setTaskDraft} courses={courses} compact />
      <button className="primary-button" onClick={addTask}>Add to dashboard</button>
    </article>
  );
}

function TaskForm({ taskDraft, setTaskDraft, addTask, courses }: { taskDraft: DraftTask; setTaskDraft: (draft: DraftTask) => void; addTask: () => void; courses: Course[] }) {
  return (
    <article className="card">
      <h2>Add assignment</h2>
      <TaskFields taskDraft={taskDraft} setTaskDraft={setTaskDraft} courses={courses} />
      <button className="primary-button" onClick={addTask}>Add assignment</button>
    </article>
  );
}

function TaskFields({ taskDraft, setTaskDraft, courses, compact = false }: { taskDraft: DraftTask; setTaskDraft: (draft: DraftTask) => void; courses: Course[]; compact?: boolean }) {
  return (
    <div className={compact ? "form-grid compact" : "form-grid"}>
      <label className="wide">Title<input value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="Exam review, problem set..." /></label>
      <label>Course<select value={taskDraft.courseId} onChange={(event) => setTaskDraft({ ...taskDraft, courseId: event.target.value })}><option value="">Personal / none</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code}</option>)}</select></label>
      <label>Due date<input type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} /></label>
      <label>Due time<input type="time" value={taskDraft.dueTime} onChange={(event) => setTaskDraft({ ...taskDraft, dueTime: event.target.value })} /></label>
      <label>Effort<input type="number" min="5" step="5" value={taskDraft.estimatedMinutes} onChange={(event) => setTaskDraft({ ...taskDraft, estimatedMinutes: Number(event.target.value) })} /></label>
      <label>Importance<select value={taskDraft.importance} onChange={(event) => setTaskDraft({ ...taskDraft, importance: Number(event.target.value) })}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>
    </div>
  );
}

function CourseForm({ courseDraft, setCourseDraft, addCourse }: { courseDraft: DraftCourse; setCourseDraft: (draft: DraftCourse) => void; addCourse: () => void }) {
  return (
    <article className="card">
      <h2>Add course</h2>
      <div className="form-grid">
        <label>Code<input value={courseDraft.code} onChange={(event) => setCourseDraft({ ...courseDraft, code: event.target.value })} placeholder="CSCE 110" /></label>
        <label>Name<input value={courseDraft.name} onChange={(event) => setCourseDraft({ ...courseDraft, name: event.target.value })} placeholder="Programming I" /></label>
        <label className="wide">Location<input value={courseDraft.location} onChange={(event) => setCourseDraft({ ...courseDraft, location: event.target.value })} placeholder="Building and room" /></label>
        <label>Color<input type="color" value={courseDraft.color} onChange={(event) => setCourseDraft({ ...courseDraft, color: event.target.value })} /></label>
        <label>Importance<select value={courseDraft.importance} onChange={(event) => setCourseDraft({ ...courseDraft, importance: Number(event.target.value) })}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>
      </div>
      <button className="primary-button" onClick={addCourse}>Add course</button>
    </article>
  );
}

function EventForm({ eventDraft, setEventDraft, addEvent, courses = [], scheduleCategories = defaultScheduleCategories }: { eventDraft: DraftEvent; setEventDraft: (draft: DraftEvent) => void; addEvent: (destination?: View) => void; courses?: Course[]; scheduleCategories?: ScheduleCategory[] }) {
  return (
    <article className="card">
      <h2>Add schedule item</h2>
      <div className="form-grid">
        <label className="wide">Title<input value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} placeholder="Study block, club meeting..." /></label>
        <label>Date<input type="date" value={eventDraft.date} onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })} /></label>
        <label>Start<input type="time" value={eventDraft.startTime} onChange={(event) => setEventDraft({ ...eventDraft, startTime: event.target.value })} /></label>
        <label>End<input type="time" value={eventDraft.endTime} onChange={(event) => setEventDraft({ ...eventDraft, endTime: event.target.value })} /></label>
        <label>Location<input value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })} placeholder="Library" /></label>
        <label>Category<select value={eventDraft.category} onChange={(event) => setEventDraft({ ...eventDraft, category: event.target.value })}>{scheduleCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Course<select value={eventDraft.courseId} onChange={(event) => setEventDraft({ ...eventDraft, courseId: event.target.value })}><option value="">No course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code}</option>)}</select></label>
      </div>
      <button className="primary-button" onClick={() => addEvent("calendar")}>Add schedule item</button>
    </article>
  );
}

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

await check("health route works", async () => {
  const body = await json("/api/health");
  if (!body.ok) throw new Error("health route failed");
});

await check("readiness route checks database", async () => {
  const body = await json("/api/ready");
  if (!body.ok || !body.checks?.databaseReachable) throw new Error("readiness route failed");
});

await check("pwa manifest is installable", async () => {
  const body = await json("/manifest.webmanifest");
  if (body.name !== "Semesterly" || body.display !== "standalone") throw new Error("manifest missing install metadata");
  if (!body.icons?.some((icon) => icon.src === "/maskable-icon.svg")) throw new Error("maskable icon missing");
});

await check("offline page is available", async () => {
  const response = await fetch(`${base}/offline`);
  if (!response.ok) throw new Error(`expected offline page 200, got ${response.status}`);
  const text = await response.text();
  if (!text.includes("You’re offline")) throw new Error("offline copy missing");
});

await check("service worker is available", async () => {
  const response = await fetch(`${base}/sw.js`);
  if (!response.ok) throw new Error(`expected service worker 200, got ${response.status}`);
  const text = await response.text();
  if (!text.includes("semesterly-shell")) throw new Error("service worker cache name missing");
});

await check("current user requires identity", async () => {
  const response = await fetch(`${base}/api/me`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("current user is isolated", async () => {
  const body = await json("/api/me", { headers: { "x-user-id": "emma" } });
  if (body.user.name !== "Emma Rodriguez") throw new Error("wrong user returned");
  if (body.user.tasks.some((task) => task.userId && task.userId !== "emma")) throw new Error("cross-user task leaked");
});

await check("signed demo session works without user header", async () => {
  const session = await json("/api/auth/demo-session", { method: "POST", headers: { "x-user-id": "emma" } });
  if (!session.token) throw new Error("session token missing");
  const body = await json("/api/me", { headers: { authorization: `Bearer ${session.token}` } });
  if (body.user.id !== "emma") throw new Error("signed session returned wrong user");
});

await check("password login rejects bad credentials", async () => {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "emma@semesterly.local", password: "wrong" }),
  });
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("password login sets http-only session cookie", async () => {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "emma@semesterly.local", password: "semesterly-demo" }),
  });
  const body = await response.json();
  if (!response.ok || body.user?.id !== "emma") throw new Error("login failed");
  const setCookie = response.headers.get("set-cookie") ?? "";
  if (!setCookie.includes("semesterly_session=") || !setCookie.toLowerCase().includes("httponly")) throw new Error("secure session cookie missing");
  const cookie = setCookie.split(";")[0];
  const me = await json("/api/me", { headers: { cookie } });
  if (me.user.id !== "emma") throw new Error("cookie session did not load current user");
  const session = await json("/api/auth/session", { headers: { cookie } });
  if (session.user?.id !== "emma") throw new Error("session route did not load cookie user");
});

await check("cookie session blocks cross-site mutation", async () => {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "emma@semesterly.local", password: "semesterly-demo" }),
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  if (!cookie) throw new Error("login cookie missing");
  const response = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { cookie, origin: "https://evil.example", "content-type": "application/json" },
    body: JSON.stringify({ title: "CSRF attempt", dueAt: new Date().toISOString() }),
  });
  if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
});

await check("account registration creates cookie session", async () => {
  const email = `smoke-${Date.now()}@semesterly.local`;
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke Student", email, password: "smoke-password-123" }),
  });
  const body = await response.json();
  if (response.status !== 201 || body.user?.email !== email) throw new Error("registration failed");
  const setCookie = response.headers.get("set-cookie") ?? "";
  if (!setCookie.includes("semesterly_session=") || !setCookie.toLowerCase().includes("httponly")) throw new Error("registration session cookie missing");
  const cookie = setCookie.split(";")[0];
  const me = await json("/api/me", { headers: { cookie } });
  if (me.user.email !== email) throw new Error("registered account did not load from cookie session");
  await json("/api/privacy/delete", { method: "DELETE", headers: { cookie, "x-confirm-delete": "DELETE-MY-DATA" } });
});

await check("logout clears session cookie", async () => {
  const response = await fetch(`${base}/api/auth/logout`, { method: "POST" });
  if (!response.ok) throw new Error("logout failed");
  const setCookie = response.headers.get("set-cookie") ?? "";
  if (!setCookie.includes("semesterly_session=") || !setCookie.includes("Max-Age=0")) throw new Error("logout did not clear session cookie");
});

await check("admin demo session requires admin token", async () => {
  const response = await fetch(`${base}/api/auth/demo-session`, { method: "POST", headers: { "x-user-id": "dom-admin" } });
  if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
});

await check("signed admin session can access admin route", async () => {
  const session = await json("/api/auth/demo-session", { method: "POST", headers: { "x-user-id": "dom-admin", "x-admin-token": process.env.ADMIN_TOKEN ?? "DOM-DEMO" } });
  const body = await json("/api/admin/users", { headers: { authorization: `Bearer ${session.token}` } });
  if (!Array.isArray(body.users) || body.users.length < 20) throw new Error("signed admin users missing");
});

await check("admin route is protected", async () => {
  const response = await fetch(`${base}/api/admin/users`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("admin route works with token", async () => {
  const body = await json("/api/admin/users", { headers: { "x-admin-token": process.env.ADMIN_TOKEN ?? "DOM-DEMO" } });
  if (!Array.isArray(body.users) || body.users.length < 20) throw new Error("admin users missing");
});

await check("task list requires identity", async () => {
  const response = await fetch(`${base}/api/tasks`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("course list requires identity", async () => {
  const response = await fetch(`${base}/api/courses`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("course list is user-scoped", async () => {
  const body = await json("/api/courses", { headers: { "x-user-id": "emma" } });
  if (!Array.isArray(body.courses) || body.courses.length === 0) throw new Error("courses missing");
  if (body.courses.some((course) => course.userId && course.userId !== "emma")) throw new Error("cross-user course leaked");
});

await check("event list requires identity", async () => {
  const response = await fetch(`${base}/api/events`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("event list is user-scoped", async () => {
  const body = await json("/api/events", { headers: { "x-user-id": "emma" } });
  if (!Array.isArray(body.events) || body.events.length === 0) throw new Error("events missing");
  if (body.events.some((event) => event.userId && event.userId !== "emma")) throw new Error("cross-user event leaked");
});

await check("task create rejects another user's course", async () => {
  const response = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Bad cross-user task", courseId: "liam-course-0", dueAt: new Date().toISOString() }),
  });
  if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`);
});

await check("event create rejects another user's course", async () => {
  const response = await fetch(`${base}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Bad cross-user event", courseId: "liam-course-0", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString() }),
  });
  if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`);
});

await check("event create validates time range", async () => {
  const startsAt = new Date(Date.now() + 3600000).toISOString();
  const endsAt = new Date().toISOString();
  const response = await fetch(`${base}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Bad event time", startsAt, endsAt }),
  });
  if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
});

await check("task create patch delete lifecycle works", async () => {
  const created = await json("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Smoke deploy task", courseId: "emma-course-0", dueAt: new Date(Date.now() + 86400000).toISOString(), estimatedMinutes: 25, importance: 2 }),
  });
  if (!created.task?.id) throw new Error("task was not created");
  const patched = await json(`/api/tasks/${created.task.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ status: "DONE" }),
  });
  if (patched.task.status !== "DONE") throw new Error("task patch failed");
  const deleted = await json(`/api/tasks/${created.task.id}`, { method: "DELETE", headers: { "x-user-id": "emma" } });
  if (!deleted.ok) throw new Error("task delete failed");
});

await check("course create patch delete lifecycle works", async () => {
  const created = await json("/api/courses", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ code: "SMK 101", name: "Smoke Course", importance: 2 }),
  });
  if (!created.course?.id) throw new Error("course was not created");
  const patched = await json(`/api/courses/${created.course.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ name: "Smoke Course Updated" }),
  });
  if (patched.course.name !== "Smoke Course Updated") throw new Error("course patch failed");
  const deleted = await json(`/api/courses/${created.course.id}`, { method: "DELETE", headers: { "x-user-id": "emma" } });
  if (!deleted.ok) throw new Error("course delete failed");
});

await check("event create patch delete lifecycle works", async () => {
  const startsAt = new Date(Date.now() + 7200000).toISOString();
  const endsAt = new Date(Date.now() + 10800000).toISOString();
  const created = await json("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Smoke deploy event", courseId: "emma-course-0", startsAt, endsAt, category: "STUDY" }),
  });
  if (!created.event?.id) throw new Error("event was not created");
  const patched = await json(`/api/events/${created.event.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Smoke deploy event updated" }),
  });
  if (patched.event.title !== "Smoke deploy event updated") throw new Error("event patch failed");
  const deleted = await json(`/api/events/${created.event.id}`, { method: "DELETE", headers: { "x-user-id": "emma" } });
  if (!deleted.ok) throw new Error("event delete failed");
});

await check("review-first imports create draft batches", async () => {
  const dueAt = new Date(Date.now() + 172800000).toISOString();
  const body = await json("/api/imports", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({
      kind: "SYLLABUS",
      sourceName: "smoke-syllabus.txt",
      summary: "Smoke syllabus import",
      items: [
        { itemType: "TASK", data: { title: "Smoke imported syllabus task", courseCode: "BIOL 111", dueAt, estimatedMinutes: 45, importance: 2 } },
      ],
    }),
  });
  if (!body.batch?.id || body.batch.status !== "NEEDS_REVIEW") throw new Error("import batch was not created for review");
  if (body.batch.items?.[0]?.status !== "PENDING") throw new Error("import item should stay pending until review");
});

await check("reviewed imports confirm into coursework", async () => {
  const startsAt = new Date(Date.now() + 21600000).toISOString();
  const endsAt = new Date(Date.now() + 25200000).toISOString();
  const draft = await json("/api/imports", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({
      kind: "SCHEDULE_SCREENSHOT",
      sourceName: "weekly-schedule.png",
      items: [
        { itemType: "COURSE", data: { code: "SMK 202", name: "Smoke Imported Course", importance: 3 } },
        { itemType: "EVENT", data: { title: "SMK 202 lecture", courseCode: "SMK 202", startsAt, endsAt, category: "CLASS", location: "Room 100" } },
      ],
    }),
  });
  const confirmed = await json(`/api/imports/${draft.batch.id}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ approvedItemIds: draft.batch.items.map((item) => item.id) }),
  });
  if (!confirmed.ok || confirmed.created.courses.length !== 1 || confirmed.created.events.length !== 1) throw new Error("import confirm did not create course/event");
  const courseId = confirmed.created.courses[0].id;
  const eventId = confirmed.created.events[0].id;
  await json(`/api/events/${eventId}`, { method: "DELETE", headers: { "x-user-id": "emma" } });
  await json(`/api/courses/${courseId}`, { method: "DELETE", headers: { "x-user-id": "emma" } });
});

await check("demo reset requires confirmation", async () => {
  const response = await fetch(`${base}/api/demo/reset`, { method: "POST", headers: { "x-user-id": "emma" } });
  if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
});

await check("admin account cannot be reset through demo route", async () => {
  const response = await fetch(`${base}/api/demo/reset`, { method: "POST", headers: { "x-user-id": "dom-admin", "x-confirm-reset": "RESET-DEMO" } });
  if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
});

await check("demo reset restores api seed data", async () => {
  const created = await json("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ title: "Smoke reset should remove me", courseId: "emma-course-0", dueAt: new Date(Date.now() + 86400000).toISOString(), estimatedMinutes: 15, importance: 1 }),
  });
  if (!created.task?.id) throw new Error("setup task was not created");
  const reset = await json("/api/demo/reset", { method: "POST", headers: { "x-user-id": "emma", "x-confirm-reset": "RESET-DEMO" } });
  if (!reset.ok) throw new Error("reset failed");
  if (reset.user.tasks.some((task) => task.title === "Smoke reset should remove me")) throw new Error("reset did not remove transient task");
  if (!reset.user.courses.some((course) => course.id === "emma-course-0")) throw new Error("reset did not restore deterministic course ids");
});

await check("privacy export requires identity", async () => {
  const response = await fetch(`${base}/api/privacy/export`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check("privacy export is user-scoped", async () => {
  const body = await json("/api/privacy/export", { headers: { "x-user-id": "emma" } });
  if (body.user.id !== "emma") throw new Error("wrong export user returned");
  if (body.user.tasks.some((task) => task.userId !== "emma")) throw new Error("cross-user task leaked in export");
});

await check("account delete requires confirmation", async () => {
  const response = await fetch(`${base}/api/privacy/delete`, { method: "DELETE", headers: { "x-user-id": "emma" } });
  if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
});

await check("admin account cannot be deleted through privacy route", async () => {
  const response = await fetch(`${base}/api/privacy/delete`, { method: "DELETE", headers: { "x-user-id": "dom-admin", "x-confirm-delete": "DELETE-MY-DATA" } });
  if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
});

await check("natural language parser works", async () => {
  const body = await json("/api/tasks/parse", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": "emma" },
    body: JSON.stringify({ input: "BIOL lab report due Wed 120 min" }),
  });
  if (body.task.estimatedMinutes !== 120) throw new Error("minutes parse failed");
  if (!body.task.courseId) throw new Error("course match failed");
});

if (process.exitCode) process.exit(process.exitCode);
console.log("Smoke checks passed.");

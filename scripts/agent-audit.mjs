import { existsSync, readFileSync } from "node:fs";

const app = readFileSync("src/components/SemesterlyApp.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const agentReadme = readFileSync("agents/README.md", "utf8");
const agentManifest = JSON.parse(readFileSync("agents/manifest.json", "utf8"));
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const failures = [];

function check(name, condition, hint) {
  if (!condition) failures.push({ name, hint });
}

check(
  "primary nav excludes Options",
  app.includes('type View = "dashboard" | "calendar" | "courses" | "profile" | "admin"') && !app.includes('"options"'),
  "View/nav should be Dashboard, Calendar, Courses, Profile, and hidden Admin only.",
);

check(
  "calendar is immediately after Dashboard",
  app.includes('["dashboard", "calendar", "courses", "profile"'),
  "Top nav order should keep Calendar immediately after Dashboard.",
);

check(
  "courses add dropdown exists",
  app.includes('className="add-dropdown"') && app.includes('Add') && app.includes('"course", "assignment", "exam", "event"'),
  "Courses page needs an Add dropdown with course, assignment, exam, and calendar/event options.",
);

check(
  "global day selector removed, calendar day controls remain",
  !app.includes('aria-label="Day selector"') &&
    !app.includes('setSelectedDate(day.date)') &&
    app.includes('className="calendar-day-controls"') &&
    app.includes('setSelectedDate((date) => addDays(date, -1))') &&
    app.includes('setSelectedDate((date) => addDays(date, 1))'),
  "Dashboard/Calendar should not use the top day selector; Calendar day view keeps simple Back/Next controls.",
);

check(
  "calendar view uses selected date",
  app.includes('startOfMonth(selectedDate)') && app.includes('startOfWeek(selectedDate)') && app.includes('isSameMonth(day, selectedDate)'),
  "Calendar day/week/month views should follow selectedDate, not a fixed today constant.",
);

check(
  "dark mode reaches document root",
  app.includes('document.documentElement.dataset.theme = theme') && css.includes(':root[data-theme="dark"]'),
  "Dark mode should apply to the whole document, not only inner cards.",
);

check(
  "dark native select menus are readable",
  css.includes('color-scheme: dark') && css.includes(':root[data-theme="dark"] select') && css.includes(':root[data-theme="dark"] option'),
  "Native select/dropdown windows need dark color-scheme and readable foreground/background.",
);

check(
  "profile stays lean",
  app.includes('<div className="card-title-row"><h2>Name</h2></div>') &&
    app.includes('<div className="card-title-row"><h2>Preferences</h2></div>') &&
    app.includes('Sign out') &&
    !app.includes('Account sign-in') &&
    !app.includes('Admin access') &&
    !app.includes('Academic snapshot') &&
    !app.includes('Setup status'),
  "Profile should only keep the header, name, preferences, and sign-out controls.",
);

const requiredAgents = [
  "product-strategist",
  "ux-demo-designer",
  "frontend-builder",
  "backend-security",
  "qa-release",
  "growth-research",
];

check(
  "development agent roster exists",
  requiredAgents.every((agent) => existsSync(`agents/${agent}.md`) && agentReadme.includes(agent)),
  "agents/ should define the standing Semesterly development agent roster and README index.",
);

check(
  "agent outputs require ship/fix/blocker summary",
  requiredAgents.every((agent) => readFileSync(`agents/${agent}.md`, "utf8").includes("Ship / Fix next / Blocked by")),
  "Each agent brief should end reports with Ship / Fix next / Blocked by.",
);

check(
  "agent manifest includes validation and workflows",
  requiredAgents.every((agent) => agentManifest.agents.some((item) => item.id === agent && Array.isArray(item.validation) && item.validation.length > 0)) && agentManifest.workflows.length >= 3,
  "agents/manifest.json should include per-agent validation commands and reusable workflows.",
);

check(
  "agent npm scripts exist",
  ["agent:check", "agent:list", "agent:brief", "agent:prompt", "agent:workflow"].every((script) => packageJson.scripts[script]),
  "package.json should expose agent check/list/brief/prompt/workflow scripts.",
);

if (failures.length) {
  console.error("Agent audit failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.hint}`);
  }
  process.exit(1);
}

console.log("Agent audit passed.");

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function fail(name, message) {
  failures.push({ name, message });
}

function warn(name, message) {
  warnings.push({ name, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const pkg = readJson("package.json");
const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
for (const [name, version] of Object.entries(allDeps)) {
  if (version === "latest") fail(`dependency:${name}`, "Dependencies must be pinned; found latest.");
  if (typeof version === "string" && /^[~^]/.test(version)) fail(`dependency:${name}`, `Dependency must be exact, found ${version}.`);
}

if (pkg.overrides?.postcss !== "8.5.10") fail("postcss override", "PostCSS override should stay pinned to 8.5.10 or newer validated version.");

for (const script of ["typecheck", "smoke", "agent:audit", "agent:check", "deploy:check", "db:migrate", "db:local:push"]) {
  if (!pkg.scripts?.[script]) fail(`script:${script}`, "Required validation script missing from package.json.");
}

for (const route of [
  "src/app/manifest.ts",
  "src/app/offline/page.tsx",
  "src/app/api/auth/demo-session/route.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/register/route.ts",
  "src/app/api/auth/logout/route.ts",
  "src/app/api/auth/session/route.ts",
  "src/app/api/demo/reset/route.ts",
  "src/app/api/health/route.ts",
  "src/app/api/me/route.ts",
  "src/app/api/ready/route.ts",
  "src/app/api/tasks/route.ts",
  "src/app/api/tasks/[id]/route.ts",
  "src/app/api/courses/route.ts",
  "src/app/api/courses/[id]/route.ts",
  "src/app/api/events/route.ts",
  "src/app/api/events/[id]/route.ts",
  "src/app/api/privacy/export/route.ts",
  "src/app/api/privacy/delete/route.ts",
  "src/app/api/admin/users/route.ts",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/support/page.tsx",
]) {
  if (!exists(route)) fail(`route:${route}`, "Critical deploy/API route is missing.");
}

for (const asset of ["public/icon.svg", "public/maskable-icon.svg", "public/sw.js"]) {
  if (!exists(asset)) fail(`asset:${asset}`, "Critical PWA/mobile asset is missing.");
}

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const key of ["DATABASE_URL", "DIRECT_URL", "ADMIN_TOKEN", "SESSION_SECRET", "DEMO_AUTH_ENABLED"]) {
  if (!envExample.includes(key)) fail(`env:${key}`, ".env.example must document this required variable.");
}

const prismaSchema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (!prismaSchema.includes('provider  = "postgresql"')) fail("prisma:provider", "Primary Prisma schema must target Postgres.");
if (!prismaSchema.includes("directUrl = env(\"DIRECT_URL\")")) fail("prisma:directUrl", "Postgres schema must define DIRECT_URL for migrations.");
if (!exists("prisma/schema.sqlite.prisma")) fail("prisma:sqlite", "Local SQLite schema must stay available for offline demo validation.");
if (!exists("prisma/migrations/0001_init_postgres/migration.sql")) fail("prisma:migration", "Initial Postgres migration is missing.");
for (const migration of ["0004_user_preferences", "0005_assignment_metadata"]) {
  if (!exists(`prisma/migrations/${migration}/migration.sql`)) fail(`prisma:migration:${migration}`, "Recent production-readiness migration is missing.");
}

const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
for (const header of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
  if (!nextConfig.includes(header)) fail(`security-header:${header}`, "Baseline security header missing from next.config.mjs.");
}

if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  fail("SESSION_SECRET", "SESSION_SECRET must be at least 32 characters when set.");
}

if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN === "change-me-before-production" || process.env.ADMIN_TOKEN === "DOM-DEMO") {
    fail("ADMIN_TOKEN", "Production deploy needs a real ADMIN_TOKEN.");
  }
  if (!process.env.DATABASE_URL) fail("DATABASE_URL", "Production deploy needs DATABASE_URL.");
  if (!process.env.DIRECT_URL) fail("DIRECT_URL", "Production deploy needs DIRECT_URL for Prisma migrations.");
  if (!process.env.SESSION_SECRET) fail("SESSION_SECRET", "Production deploy needs SESSION_SECRET for signed sessions.");
  if (process.env.DEMO_AUTH_ENABLED === "true") fail("DEMO_AUTH_ENABLED", "Production deploy must disable demo x-user-id auth. Use password/session or provider auth.");
  if (!process.env.DATABASE_URL?.startsWith("postgresql://") && !process.env.DATABASE_URL?.startsWith("postgres://")) fail("DATABASE_URL", "Production DATABASE_URL must be Postgres.");
}

if (warnings.length) {
  console.warn("Deploy check warnings:\n");
  for (const item of warnings) console.warn(`- ${item.name}: ${item.message}`);
  console.warn("");
}

if (failures.length) {
  console.error("Deploy check failed:\n");
  for (const item of failures) console.error(`- ${item.name}: ${item.message}`);
  process.exit(1);
}

console.log("Deploy check passed.");

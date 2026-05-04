-- Store user-defined schedule categories and allow custom event category names.
ALTER TABLE "User" ADD COLUMN "scheduleCategories" TEXT;
ALTER TABLE "Event" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
ALTER TABLE "Event" ALTER COLUMN "category" SET DEFAULT 'OTHER';

-- Drop the default so we can drop the enum type
ALTER TABLE "Issue" ALTER COLUMN "priority" DROP DEFAULT;

-- Convert column to text to allow data updates before enum change
ALTER TABLE "Issue" ALTER COLUMN "priority" TYPE TEXT;

-- Map removed values to new ones
UPDATE "Issue" SET "priority" = 'high' WHERE "priority" = 'urgent';
UPDATE "Issue" SET "priority" = 'medium' WHERE "priority" = 'normal';

-- Recreate the enum with the new values
DROP TYPE "IssuePriority";
CREATE TYPE "IssuePriority" AS ENUM ('low', 'medium', 'high');

-- Convert column back to the new enum type and restore default
ALTER TABLE "Issue" ALTER COLUMN "priority" TYPE "IssuePriority" USING "priority"::"IssuePriority";
ALTER TABLE "Issue" ALTER COLUMN "priority" SET DEFAULT 'medium'::"IssuePriority";

-- Drop old per-project dropdown tables
DROP TABLE IF EXISTS "IssueTypeOption";
DROP TABLE IF EXISTS "ModuleOption";
DROP TABLE IF EXISTS "DepartmentOption";

-- Create global master table
CREATE TABLE "DropdownMaster" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DropdownMaster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DropdownMaster_type_label_key" ON "DropdownMaster"("type", "label");

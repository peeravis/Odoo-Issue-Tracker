-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_projectId_fkey";

-- DropIndex
DROP INDEX "Client_projectId_name_key";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "projectId";

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

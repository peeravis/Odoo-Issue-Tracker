CREATE INDEX IF NOT EXISTS "Issue_projectId_status_idx" ON "Issue"("projectId", "status");
CREATE INDEX IF NOT EXISTS "Issue_projectId_priority_idx" ON "Issue"("projectId", "priority");
CREATE INDEX IF NOT EXISTS "Issue_assigneeId_idx" ON "Issue"("assigneeId");
CREATE INDEX IF NOT EXISTS "Issue_createdById_idx" ON "Issue"("createdById");
CREATE INDEX IF NOT EXISTS "Issue_dueDate_idx" ON "Issue"("dueDate");
CREATE INDEX IF NOT EXISTS "Issue_createdAt_idx" ON "Issue"("createdAt");

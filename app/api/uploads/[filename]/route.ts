import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/constants";
import { logger } from "@/lib/logger";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".csv": "text/csv",
};

// Filenames are random (timestamp+random or sanitized) so URLs are
// unguessable. We intentionally do NOT gate this on the session cookie —
// expired sessions were causing 401s on <img> requests, showing broken
// icons on preview even when the user was actively logged in on the same
// tab (the tab still had a stale page loaded).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safe);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safe).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safe}"`,
        "Cache-Control": "private, max-age=31536000",
      },
    });
  } catch (err) {
    logger.error("[uploads] file not found or unreadable", {
      requested: safe,
      resolved: filePath,
      uploadDir: UPLOAD_DIR,
      error: String(err),
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

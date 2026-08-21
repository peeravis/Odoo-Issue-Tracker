import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { decrypt } from "@/lib/session";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await decrypt(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { filename } = await params;
  const safe = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safe);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safe).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const INLINE_TYPES = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]);
    const disposition = INLINE_TYPES.has(ext) ? "inline" : "attachment";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(safe)}`,
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

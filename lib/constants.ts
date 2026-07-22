import path from "path";

// App
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Pagination
export const PAGE_SIZE = 25;

// File uploads
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"] as const;
export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

// Roles
export const SYSTEM_ROLES = ["admin", "pm", "member", "rnao", "co", "gl"] as const;
export const ASSIGNEE_ROLES = ["vendor", "aspd"] as const;

// UI limits
export const MAX_DROPDOWN_OPTIONS = 50;

// Import
export const IMPORT_HEADER_ROWS = 2;

// Session
export const SESSION_DEFAULT_EXPIRY = "7d";

// Security
export const BCRYPT_ROUNDS = 12;

// Allowed file types for issue attachments
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
]);

// Allowed MIME type for Excel imports
export const ALLOWED_IMPORT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Max rows to export in one request (prevents OOM)
export const EXPORT_MAX_ROWS = 10_000;

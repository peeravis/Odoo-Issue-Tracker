import path from "path";

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

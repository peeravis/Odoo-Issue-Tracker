import { NextResponse } from "next/server";
import { getConfigs } from "@/lib/config";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET() {
  try {
    const cfg = await getConfigs(["app.logoUrl"]);
    const logoUrl = cfg["app.logoUrl"];

    if (logoUrl) {
      const filename = path.basename(logoUrl.split("?")[0]);
      const buffer = await readFile(path.join(UPLOAD_DIR, filename));
      const ext = path.extname(filename).toLowerCase();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": MIME[ext] ?? "image/png",
          "Cache-Control": "no-cache, must-revalidate",
        },
      });
    }
  } catch { /* fallthrough to default icon */ }

  try {
    const buffer = await readFile(path.join(process.cwd(), "public", "icon.png"));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

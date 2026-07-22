import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { decrypt } from "@/lib/session";
import { ALLOWED_IMPORT_TYPE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  if (file.type !== ALLOWED_IMPORT_TYPE) {
    return Response.json({ error: "รองรับเฉพาะไฟล์ .xlsx เท่านั้น" }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheets = workbook.worksheets.map((ws) => ws.name);
  return Response.json({ sheets });
}

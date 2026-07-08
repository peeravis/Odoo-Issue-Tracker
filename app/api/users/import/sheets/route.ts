import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { decrypt } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = Buffer.from(await file.arrayBuffer()) as any;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets = workbook.worksheets.map((ws) => ws.name);
  return Response.json({ sheets });
}

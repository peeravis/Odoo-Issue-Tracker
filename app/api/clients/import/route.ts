import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
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

  const sheet = workbook.worksheets[0];
  if (!sheet) return Response.json({ error: "Empty workbook" }, { status: 400 });

  const rows: { name: string; code: string | null; contactInfo: string | null }[] = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const name = String(row.getCell(1).value ?? "").trim();
    const code = String(row.getCell(2).value ?? "").trim() || null;
    const contactInfo = String(row.getCell(3).value ?? "").trim() || null;
    if (name) rows.push({ name, code, contactInfo });
  });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await prisma.client.findUnique({ where: { name: row.name } });
      if (existing) {
        await prisma.client.update({ where: { id: existing.id }, data: { code: row.code, contactInfo: row.contactInfo } });
        updated++;
      } else {
        await prisma.client.create({ data: row });
        created++;
      }
    } catch {
      errors.push(row.name);
    }
  }

  return Response.json({ created, updated, errors });
}

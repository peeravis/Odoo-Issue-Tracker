import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session || session.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clients");

  const headerRow = sheet.addRow(["Name", "Code", "Contact"]);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center" };
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [{ width: 40 }, { width: 15 }, { width: 40 }];

  for (const c of clients) {
    sheet.addRow([c.name, c.code ?? "", c.contactInfo ?? ""]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), "yyyyMMdd");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clients_${dateStr}.xlsx"`,
    },
  });
}

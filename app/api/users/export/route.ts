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

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      projectMembers: { include: { project: { select: { code: true, name: true } } } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");

  const headerRow = sheet.addRow([
    "Name", "Email", "Password", "Role", "Status", "Projects (codes, comma-separated)",
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" },
      bottom: { style: "thin" }, right: { style: "thin" },
    };
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [
    { width: 25 }, { width: 35 }, { width: 20 },
    { width: 12 }, { width: 12 }, { width: 40 },
  ];

  // Add note row explaining password column
  const noteRow = sheet.addRow([
    "(ชื่อผู้ใช้)", "(อีเมล)", "(เว้นว่างถ้าไม่เปลี่ยน password)", "(admin/pm/member/rnao/co/gl)", "(active/inactive)", "(เช่น DEMO,ODOO)",
  ]);
  noteRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF6B7280" }, size: 9 };
  });

  for (const user of users) {
    const projectCodes = user.projectMembers.map((m) => m.project.code).join(",");
    const dataRow = sheet.addRow([
      user.name,
      user.email,
      "", // password blank by default
      user.role,
      user.isActive ? "active" : "inactive",
      projectCodes,
    ]);
    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: "top" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), "yyyyMMdd");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="users_${dateStr}.xlsx"`,
    },
  });
}

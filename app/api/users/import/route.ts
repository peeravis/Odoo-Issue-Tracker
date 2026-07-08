import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";

type ImportResult = {
  created: number;
  updated: number;
  skipped: string[];
  errors: string[];
};

export async function POST(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const sheetName = (formData.get("sheetName") as string | null)?.trim() ?? "";
  const extraRole = (formData.get("extraRole") as string | null)?.trim() ?? "";
  const extraRoles = extraRole === "aspd" || extraRole === "vendor" ? [extraRole] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = Buffer.from(await file.arrayBuffer()) as any;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = sheetName
    ? workbook.getWorksheet(sheetName) ?? workbook.worksheets[0]
    : workbook.worksheets[0];
  if (!sheet) return Response.json({ error: "Empty workbook" }, { status: 400 });

  // Pre-load all projects by code for fast lookup
  const allProjects = await prisma.project.findMany({ select: { id: true, code: true } });
  const projectByCode = new Map(allProjects.map((p) => [p.code.toUpperCase(), p.id]));

  const result: ImportResult = { created: 0, updated: 0, skipped: [], errors: [] };

  const rows: {
    name: string;
    email: string;
    password: string;
    role: string;
    status: string;
    projects: string;
  }[] = [];

  sheet.eachRow((row, rowNum) => {
    // Skip header row and note row
    if (rowNum <= 2) return;
    const name = String(row.getCell(1).value ?? "").trim();
    const email = String(row.getCell(2).value ?? "").trim().toLowerCase();
    const password = String(row.getCell(3).value ?? "").trim();
    const role = String(row.getCell(4).value ?? "member").trim().toLowerCase();
    const status = String(row.getCell(5).value ?? "active").trim().toLowerCase();
    const projects = String(row.getCell(6).value ?? "").trim();

    if (!name || !email) return;
    rows.push({ name, email, password, role, status, projects });
  });

  for (const row of rows) {
    try {
      const validRoles = ["admin", "pm", "member", "rnao", "co", "gl"];
      const role = validRoles.includes(row.role) ? row.role : "member";
      const isActive = row.status !== "inactive";

      // Resolve project IDs from codes
      const projectCodes = row.projects
        ? row.projects.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
        : [];
      const projectIds = projectCodes
        .map((code) => projectByCode.get(code))
        .filter((id): id is string => !!id);

      const unknownCodes = projectCodes.filter((c) => !projectByCode.has(c));
      if (unknownCodes.length > 0) {
        result.skipped.push(`${row.email}: ไม่พบ project code [${unknownCodes.join(",")}]`);
      }

      const existing = await prisma.user.findUnique({ where: { email: row.email } });

      if (existing) {
        // Update existing user
        const data: Record<string, unknown> = { name: row.name, role, isActive, extraRoles };
        if (row.password && row.password.length >= 6) {
          data.password = await bcrypt.hash(row.password, 12);
        }
        await prisma.user.update({ where: { id: existing.id }, data });

        // Replace project memberships for member-level roles
        const memberRoles = ["member", "rnao", "co", "gl"];
        if (memberRoles.includes(role)) {
          await prisma.projectMember.deleteMany({ where: { userId: existing.id } });
          if (projectIds.length > 0) {
            await prisma.projectMember.createMany({
              data: projectIds.map((projectId) => ({ projectId, userId: existing.id })),
              skipDuplicates: true,
            });
          }
        }

        result.updated++;
      } else {
        // Create new user — password required
        if (!row.password || row.password.length < 6) {
          result.errors.push(`${row.email}: ต้องระบุ password (อย่างน้อย 6 ตัว) สำหรับ user ใหม่`);
          continue;
        }

        const hashed = await bcrypt.hash(row.password, 12);
        const user = await prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            password: hashed,
            role: role as "admin" | "pm" | "member" | "rnao" | "co" | "gl",
            isActive,
            extraRoles,
          },
        });

        const memberRoles2 = ["member", "rnao", "co", "gl"];
        if (memberRoles2.includes(role) && projectIds.length > 0) {
          await prisma.projectMember.createMany({
            data: projectIds.map((projectId) => ({ projectId, userId: user.id })),
            skipDuplicates: true,
          });
        }

        result.created++;
      }
    } catch {
      result.errors.push(`${row.email}: เกิดข้อผิดพลาด`);
    }
  }

  return Response.json(result);
}

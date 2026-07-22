import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { IMPORT_HEADER_ROWS } from "@/lib/constants";

const BCRYPT_ROUNDS = 10;
const HASH_CONCURRENCY = 8;

type ImportResult = {
  created: number;
  updated: number;
  skipped: string[];
  errors: string[];
};

type Row = {
  name: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  projectCodes: string[];
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

  // Parse rows
  const validRoles = ["admin", "pm", "member", "rnao", "co", "gl"];
  const rows: Row[] = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum <= IMPORT_HEADER_ROWS) return;
    const rawName = String(row.getCell(1).value ?? "").trim();
    const email = String(row.getCell(2).value ?? "").trim().toLowerCase();
    const password = String(row.getCell(3).value ?? "").trim();
    const rawRole = String(row.getCell(4).value ?? "member").trim().toLowerCase();
    const status = String(row.getCell(5).value ?? "active").trim().toLowerCase();
    const projects = String(row.getCell(6).value ?? "").trim();
    if (!email) return;
    rows.push({
      name: rawName || email.split("@")[0],
      email,
      password,
      role: validRoles.includes(rawRole) ? rawRole : "member",
      isActive: status !== "inactive",
      projectCodes: projects ? projects.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) : [],
    });
  });

  // Pre-load all projects and existing users in bulk
  const [allProjects, existingUsers] = await Promise.all([
    prisma.project.findMany({ select: { id: true, code: true } }),
    prisma.user.findMany({
      where: { email: { in: rows.map((r) => r.email) } },
      select: { id: true, email: true },
    }),
  ]);
  const projectByCode = new Map(allProjects.map((p) => [p.code.toUpperCase(), p.id]));
  const existingByEmail = new Map(existingUsers.map((u) => [u.email, u.id]));

  // Pre-hash all passwords in parallel batches (cost 10 = ~4x faster than 12)
  const hashMap = new Map<string, string>();
  const toHash = rows.filter((r) => r.password && r.password.length >= 6).map((r) => r.password);
  const uniquePasswords = [...new Set(toHash)];

  for (let i = 0; i < uniquePasswords.length; i += HASH_CONCURRENCY) {
    const batch = uniquePasswords.slice(i, i + HASH_CONCURRENCY);
    const hashes = await Promise.all(batch.map((p) => bcrypt.hash(p, BCRYPT_ROUNDS)));
    batch.forEach((p, idx) => hashMap.set(p, hashes[idx]));
  }

  const result: ImportResult = { created: 0, updated: 0, skipped: [], errors: [] };
  const memberRoles = ["member", "rnao", "co", "gl"];

  for (const row of rows) {
    try {
      const projectIds = row.projectCodes
        .map((c) => projectByCode.get(c))
        .filter((id): id is string => !!id);

      const unknownCodes = row.projectCodes.filter((c) => !projectByCode.has(c));
      if (unknownCodes.length > 0) {
        result.skipped.push(`${row.email}: ไม่พบ project code [${unknownCodes.join(",")}]`);
      }

      const existingId = existingByEmail.get(row.email);

      if (existingId) {
        const data: Record<string, unknown> = { name: row.name, role: row.role, isActive: row.isActive, extraRoles };
        if (row.password && row.password.length >= 6) {
          data.password = hashMap.get(row.password);
        }
        await prisma.user.update({ where: { id: existingId }, data });

        if (memberRoles.includes(row.role)) {
          await prisma.projectMember.deleteMany({ where: { userId: existingId } });
          if (projectIds.length > 0) {
            await prisma.projectMember.createMany({
              data: projectIds.map((projectId) => ({ projectId, userId: existingId })),
              skipDuplicates: true,
            });
          }
        }
        result.updated++;
      } else {
        if (!row.password || row.password.length < 6) {
          result.errors.push(`${row.email}: ต้องระบุ password (อย่างน้อย 6 ตัว) สำหรับ user ใหม่`);
          continue;
        }
        const hashed = hashMap.get(row.password)!;
        const user = await prisma.user.create({
          data: { name: row.name, email: row.email, password: hashed, role: row.role, isActive: row.isActive, extraRoles },
        });
        if (memberRoles.includes(row.role) && projectIds.length > 0) {
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

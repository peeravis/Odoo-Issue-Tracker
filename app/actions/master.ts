"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm")) throw new Error("Forbidden");
}

export async function addDropdownMaster(type: string, label: string) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) return;
  const existing = await prisma.dropdownMaster.findFirst({ where: { type, label: trimmed, projectId: null } });
  if (!existing) {
    const count = await prisma.dropdownMaster.count({ where: { type } });
    await prisma.dropdownMaster.create({ data: { type, label: trimmed, sortOrder: count, projectId: null } });
  }
  revalidatePath("/master-data");
  revalidatePath("/issues/new");
  revalidatePath("/issues", "layout");
}

export async function deleteDropdownMaster(id: string) {
  await requireAdmin();
  await prisma.dropdownMaster.delete({ where: { id } });
  revalidatePath("/master-data");
  revalidatePath("/issues/new");
  revalidatePath("/issues", "layout");
}

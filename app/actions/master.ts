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
  const count = await prisma.dropdownMaster.count({ where: { type } });
  await prisma.dropdownMaster.upsert({
    where: { type_label: { type, label: trimmed } },
    create: { type, label: trimmed, sortOrder: count },
    update: {},
  });
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

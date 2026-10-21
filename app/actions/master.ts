"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPermissions } from "@/lib/permissions";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Forbidden");
  const perms = await getPermissions(session.role);
  if (!perms.canManageMasterData) throw new Error("Forbidden");
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

export async function addProjectDropdownFromMaster(projectId: string, type: string, label: string) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) return;
  const count = await prisma.dropdownMaster.count({ where: { type, projectId } });
  await prisma.dropdownMaster.upsert({
    where: { type_label_projectId: { type, label: trimmed, projectId } },
    create: { type, label: trimmed, projectId, sortOrder: count },
    update: {},
  });
  revalidatePath("/master-data");
  revalidatePath("/issues/new");
  revalidatePath("/issues", "layout");
  redirect(`/master-data?projectId=${projectId}`);
}

export async function deleteProjectDropdownFromMaster(id: string, projectId: string) {
  await requireAdmin();
  await prisma.dropdownMaster.delete({ where: { id } });
  revalidatePath("/master-data");
  revalidatePath("/issues/new");
  revalidatePath("/issues", "layout");
  redirect(`/master-data?projectId=${projectId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { FieldType } from "@/lib/types";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "pm") throw new Error("Forbidden");
  return session;
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string).toUpperCase();
  const description = (formData.get("description") as string) || null;

  const project = await prisma.project.create({
    data: { name, code, description },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}/settings`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const status = formData.get("status") as "active" | "closed";

  await prisma.project.update({
    where: { id: projectId },
    data: { name, description, status },
  });

  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/projects");
}

export async function addProjectMember(projectId: string, userId: string) {
  await requireAdmin();
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId },
    update: {},
  });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/users");
}

export async function removeProjectMember(projectId: string, userId: string) {
  await requireAdmin();
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/users");
}

// Custom field definitions
export async function upsertFieldDefinition(projectId: string, formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string) || undefined;
  const fieldKey = formData.get("fieldKey") as string;
  const label = formData.get("label") as string;
  const fieldType = formData.get("fieldType") as FieldType;
  const isRequired = formData.get("isRequired") === "true";
  const sortOrder = parseInt((formData.get("sortOrder") as string) || "0");
  const optionsRaw = formData.get("options") as string;
  const options = optionsRaw ? JSON.parse(optionsRaw) : null;

  if (id) {
    await prisma.projectFieldDefinition.update({
      where: { id },
      data: { label, fieldType, isRequired, sortOrder, options },
    });
  } else {
    await prisma.projectFieldDefinition.create({
      data: { projectId, fieldKey, label, fieldType, isRequired, sortOrder, options },
    });
  }

  revalidatePath(`/projects/${projectId}/settings`);
}

export async function deleteFieldDefinition(projectId: string, fieldId: string) {
  await requireAdmin();
  await prisma.projectFieldDefinition.delete({ where: { id: fieldId } });
  revalidatePath(`/projects/${projectId}/settings`);
}



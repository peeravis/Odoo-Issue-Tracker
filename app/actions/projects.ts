"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { FieldType } from "@/lib/types";
import { getPermissions } from "@/lib/permissions";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { createProjectSchema, updateProjectSchema } from "@/lib/schemas";

async function requireAdmin() {
  const session = await requireSession();
  const perms = await getPermissions(session.role);
  if (!perms.canManageProjects) throw new ForbiddenError();
  return session;
}

export async function createProject(formData: FormData) {
  await requireAdmin();

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const { name, description } = parsed.data;
  const code = parsed.data.code.toUpperCase();

  const project = await prisma.project.create({
    data: { name, code, description },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}/settings`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await requireAdmin();

  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const { name, description, status } = parsed.data;

  await prisma.project.update({
    where: { id: projectId },
    data: { name, description, status },
  });

  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}/settings`);
}

export async function addProjectMember(projectId: string, formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const projectRole = (formData.get("projectRole") as string) || "developer";
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, projectRole },
    update: {},
  });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/users");
  redirect(`/projects/${projectId}/settings`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  await requireAdmin();
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/users");
  redirect(`/projects/${projectId}/settings`);
}

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
  redirect(`/projects/${projectId}/settings`);
}

export async function deleteFieldDefinition(projectId: string, fieldId: string) {
  await requireAdmin();
  await prisma.projectFieldDefinition.delete({ where: { id: fieldId } });
  revalidatePath(`/projects/${projectId}/settings`);
  redirect(`/projects/${projectId}/settings`);
}

export async function addProjectDropdown(projectId: string, formData: FormData) {
  await requireAdmin();
  const type = formData.get("type") as string;
  const label = (formData.get("label") as string)?.trim();
  if (!label) return;
  const count = await prisma.dropdownMaster.count({ where: { type, projectId } });
  await prisma.dropdownMaster.upsert({
    where: { type_label_projectId: { type, label, projectId } },
    create: { type, label, projectId, sortOrder: count },
    update: {},
  });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/issues/new`);
  revalidatePath("/issues", "layout");
  redirect(`/projects/${projectId}/settings`);
}

export async function deleteProjectDropdown(id: string, projectId: string) {
  await requireAdmin();
  await prisma.dropdownMaster.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/issues/new`);
  revalidatePath("/issues", "layout");
  redirect(`/projects/${projectId}/settings`);
}

export async function upsertStatusConfig(projectId: string, formData: FormData) {
  await requireAdmin();

  const entries: Array<{ statusKey: string; label: string; isActive: boolean; sortOrder: number }> = [];
  let idx = 0;
  while (formData.has(`configs[${idx}][statusKey]`)) {
    const statusKey = formData.get(`configs[${idx}][statusKey]`) as string;
    const label = (formData.get(`configs[${idx}][label]`) as string) || statusKey;
    const isActive = formData.get(`configs[${idx}][isActive]`) === "true";
    const sortOrder = parseInt((formData.get(`configs[${idx}][sortOrder]`) as string) || "0");
    entries.push({ statusKey, label, isActive, sortOrder });
    idx++;
  }

  for (const cfg of entries) {
    await prisma.projectStatusConfig.upsert({
      where: { projectId_statusKey: { projectId, statusKey: cfg.statusKey } },
      create: { projectId, statusKey: cfg.statusKey, label: cfg.label, isActive: cfg.isActive, sortOrder: cfg.sortOrder },
      update: { label: cfg.label, isActive: cfg.isActive },
    });
  }
  revalidatePath(`/projects/${projectId}/settings`);
  redirect(`/projects/${projectId}/settings`);
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: string) {
  await requireAdmin();
  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { projectRole: role },
  });
  revalidatePath(`/projects/${projectId}/settings`);
  redirect(`/projects/${projectId}/settings`);
}

export async function addProjectGroup(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string).trim();
  if (!name) return;
  const count = await prisma.projectGroup.count();
  await prisma.projectGroup.create({ data: { name, sortOrder: count } });
  revalidatePath("/master-data");
  revalidatePath("/projects");
}

export async function deleteProjectGroup(id: string) {
  await requireAdmin();
  await prisma.projectGroup.delete({ where: { id } });
  revalidatePath("/master-data");
  revalidatePath("/projects");
}

export async function updateProjectGroup(projectId: string, formData: FormData) {
  await requireAdmin();
  const groupId = (formData.get("groupId") as string) || null;
  await prisma.project.update({ where: { id: projectId }, data: { groupId } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/settings`);
  redirect(`/projects/${projectId}/settings`);
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  redirect("/projects");
}

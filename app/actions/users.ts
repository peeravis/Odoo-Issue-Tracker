"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Forbidden");
  return session;
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const extraRoles = (formData.getAll("extraRoles") as string[]).filter(Boolean);

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, password: hashed, role, extraRoles } });

  revalidatePath("/users");
}

export async function updateUser(userId: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const isActive = formData.get("isActive") === "true";
  const extraRoles = (formData.getAll("extraRoles") as string[]).filter(Boolean);

  await prisma.user.update({ where: { id: userId }, data: { name, role, isActive, extraRoles } });
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}

export async function resetPassword(userId: string, formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  if (!password || password.length < 6) throw new Error("Password too short");

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

export async function addUserToProject(userId: string, projectId: string) {
  await requireAdmin();
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId },
    update: {},
  });
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/projects/${projectId}/settings`);
}

export async function removeUserFromProject(userId: string, projectId: string) {
  await requireAdmin();
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/projects/${projectId}/settings`);
}

export async function deleteUser(userId: string) {
  const session = await requireAdmin();
  if (session.userId === userId) throw new Error("ไม่สามารถลบตัวเองได้");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
}

export async function setUserProjects(userId: string, projectIds: string[]) {
  await requireAdmin();
  await prisma.projectMember.deleteMany({ where: { userId } });
  if (projectIds.length > 0) {
    await prisma.projectMember.createMany({
      data: projectIds.map((projectId) => ({ projectId, userId })),
      skipDuplicates: true,
    });
  }
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
}

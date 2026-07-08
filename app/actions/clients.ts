"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Forbidden");
}

export async function upsertClient(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string) || undefined;
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const contactInfo = (formData.get("contactInfo") as string) || null;

  if (id) {
    await prisma.client.update({ where: { id }, data: { name, code, contactInfo } });
  } else {
    await prisma.client.create({ data: { name, code, contactInfo } });
  }

  revalidatePath("/clients");
}

export async function deleteClient(id: string) {
  await requireAdmin();
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
}

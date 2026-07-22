"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { loginSchema, changePasswordSchema } from "@/lib/schemas";

export async function login(
  _state: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    extraRoles: user.extraRoles,
  });

  const callbackUrl = (formData.get("callbackUrl") as string) || "";
  const isSafe = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
  redirect(isSafe ? callbackUrl : user.role === "admin" ? "/dashboard" : "/projects");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "ไม่พบผู้ใช้งาน" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  return { success: true };
}

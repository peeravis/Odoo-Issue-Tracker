"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export async function login(
  _state: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

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
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "กรุณากรอกข้อมูลให้ครบ" };
  }
  if (newPassword.length < 6) {
    return { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "รหัสผ่านใหม่ไม่ตรงกัน" };
  }

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

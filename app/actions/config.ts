"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getConfigs } from "@/lib/config";
import nodemailer from "nodemailer";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Forbidden");
  return session;
}

async function upsertMany(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

export async function saveAppConfig(formData: FormData) {
  await requireAdmin();
  await upsertMany({
    "app.name": (formData.get("app.name") as string) || "Issue Tracker",
    "app.baseUrl": (formData.get("app.baseUrl") as string) || "http://localhost:3000",
  });
  revalidatePath("/config");
  redirect("/config?tab=app&saved=1");
}

export async function saveEmailConfig(formData: FormData) {
  await requireAdmin();
  const pass = formData.get("email.smtpPass") as string;
  const entries: Record<string, string> = {
    "email.enabled": formData.get("email.enabled") === "true" ? "true" : "false",
    "email.smtpHost": (formData.get("email.smtpHost") as string) || "",
    "email.smtpPort": (formData.get("email.smtpPort") as string) || "587",
    "email.smtpSecure": formData.get("email.smtpSecure") === "true" ? "true" : "false",
    "email.smtpUser": (formData.get("email.smtpUser") as string) || "",
    "email.fromName": (formData.get("email.fromName") as string) || "Issue Tracker",
    "email.fromEmail": (formData.get("email.fromEmail") as string) || "",
  };
  // Only update password if a new one was entered
  if (pass && pass !== "••••••••") {
    entries["email.smtpPass"] = pass;
  }
  await upsertMany(entries);
  revalidatePath("/config");
  redirect("/config?tab=email&saved=1");
}

export async function saveIssueDefaults(formData: FormData) {
  await requireAdmin();
  await upsertMany({
    "issue.defaultPriority": (formData.get("issue.defaultPriority") as string) || "medium",
    "issue.defaultStatus": (formData.get("issue.defaultStatus") as string) || "open",
  });
  revalidatePath("/config");
  redirect("/config?tab=issues&saved=1");
}

export async function testEmailConnection(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const session = await getSession();
  if (!session) return { ok: false, message: "Unauthorized" };

  const cfg = await getConfigs([
    "email.smtpHost", "email.smtpPort", "email.smtpSecure",
    "email.smtpUser", "email.smtpPass", "email.fromName", "email.fromEmail",
  ]);

  if (!cfg["email.smtpHost"]) return { ok: false, message: "ยังไม่ได้ตั้งค่า SMTP Host" };

  try {
    const transporter = nodemailer.createTransport({
      host: cfg["email.smtpHost"],
      port: Number(cfg["email.smtpPort"] || 587),
      secure: cfg["email.smtpSecure"] === "true",
      auth: cfg["email.smtpUser"] ? { user: cfg["email.smtpUser"], pass: cfg["email.smtpPass"] } : undefined,
    });
    await transporter.verify();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      await transporter.sendMail({
        from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
        to: user.email,
        subject: "Issue Tracker — Test Email",
        html: `<p>การตั้งค่า SMTP ถูกต้อง ระบบสามารถส่ง email ได้แล้ว</p><p style="color:#9ca3af;font-size:12px">Sent by Issue Tracker Config Test</p>`,
      });
    }

    return { ok: true, message: `เชื่อมต่อสำเร็จ${user?.email ? ` · ส่ง test email ไปที่ ${user.email} แล้ว` : ""}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ" };
  }
}

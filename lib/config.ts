import { prisma } from "@/lib/prisma";
import { BASE_URL } from "@/lib/constants";

export const CONFIG_DEFAULTS: Record<string, string> = {
  "app.name": "Issue Tracker",
  "app.baseUrl": BASE_URL,
  "app.logoUrl": "",
  "app.sessionTimeout": "480",
  "email.enabled": "true",
  "email.smtpHost": process.env.SMTP_HOST ?? "",
  "email.smtpPort": process.env.SMTP_PORT ?? "587",
  "email.smtpSecure": process.env.SMTP_SECURE ?? "false",
  "email.smtpUser": process.env.SMTP_USER ?? "",
  "email.smtpPass": process.env.SMTP_PASS ?? "",
  "email.fromName": "Issue Tracker",
  "email.fromEmail": process.env.SMTP_FROM ?? "noreply@issuetracker.local",
  "issue.defaultPriority": "medium",
  "issue.defaultStatus": "open",
};

export async function getConfig(key: string): Promise<string> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    return row?.value ?? CONFIG_DEFAULTS[key] ?? "";
  } catch {
    return CONFIG_DEFAULTS[key] ?? "";
  }
}

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const key of keys) result[key] = CONFIG_DEFAULTS[key] ?? "";
  try {
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
    for (const row of rows) result[row.key] = row.value;
  } catch {
    // table not yet migrated — return defaults
  }
  return result;
}

export async function setConfig(key: string, value: string): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch {
    // table not yet migrated
  }
}

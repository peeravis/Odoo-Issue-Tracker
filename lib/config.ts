import { prisma } from "@/lib/prisma";

export const CONFIG_DEFAULTS: Record<string, string> = {
  "app.name": "Issue Tracker",
  "app.baseUrl": process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
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
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  return row?.value ?? CONFIG_DEFAULTS[key] ?? "";
}

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = map.get(key) ?? CONFIG_DEFAULTS[key] ?? "";
  }
  return result;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

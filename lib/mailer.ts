import nodemailer from "nodemailer";
import { getConfigs } from "./config";
import { PRIORITY_LABELS, STATUS_LABELS } from "./utils";
import { prisma } from "./prisma";

/** Fetch emails of all active ASPD/Vendor users, excluding specified addresses. */
async function getGroupBcc(exclude: string[]): Promise<string[]> {
  const excludeSet = new Set(exclude.map((e) => e.toLowerCase()));
  const users = await prisma.user.findMany({
    where: { isActive: true, extraRoles: { hasSome: ["vendor", "aspd"] } },
    select: { email: true },
  });
  return users.map((u) => u.email).filter((e) => e && !excludeSet.has(e.toLowerCase()));
}

export interface ResolvedEmailPayload {
  to: string;
  creatorName: string;
  issueCode: string;
  issueTitle: string;
  issueUrl: string;
  projectName: string;
  priority: string;
  client?: string | null;
  department?: string | null;
  module?: string | null;
  dueDate?: Date | null;
  solution?: string | null;
}

export interface CommentEmailPayload {
  to: string;
  recipientName: string;
  commenterName: string;
  issueCode: string;
  issueTitle: string;
  issueUrl: string;
  projectName: string;
  commentContent: string;
}

export interface WaitForCheckEmailPayload {
  to: string;
  creatorName: string;
  issueCode: string;
  issueTitle: string;
  issueUrl: string;
  projectName: string;
  priority: string;
  client?: string | null;
  department?: string | null;
  module?: string | null;
  dueDate?: Date | null;
  solution?: string | null;
}

export interface AssignmentEmailPayload {
  to: string;
  assigneeName: string;
  issueCode: string;
  issueTitle: string;
  issueUrl: string;
  projectName: string;
  priority: string;
  status: string;
  client?: string | null;
  department?: string | null;
  module?: string | null;
  dueDate?: Date | null;
  description?: string | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#dc2626",
  medium: "#d97706",
  low:    "#6b7280",
};

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280;white-space:nowrap;width:130px">${label}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#111827">${value}</td>
    </tr>`;
}

export async function sendAssignmentEmail(payload: AssignmentEmailPayload) {
  const cfg = await getConfigs([
    "email.enabled", "email.smtpHost", "email.smtpPort",
    "email.smtpSecure", "email.smtpUser", "email.smtpPass",
    "email.fromName", "email.fromEmail",
  ]);

  if (cfg["email.enabled"] !== "true") return;
  if (!cfg["email.smtpHost"]) return;

  const transporter = nodemailer.createTransport({
    host: cfg["email.smtpHost"],
    port: Number(cfg["email.smtpPort"] || 587),
    secure: cfg["email.smtpSecure"] === "true",
    auth: cfg["email.smtpUser"]
      ? { user: cfg["email.smtpUser"], pass: cfg["email.smtpPass"] }
      : undefined,
  });

  const priorityLabel = PRIORITY_LABELS[payload.priority as keyof typeof PRIORITY_LABELS] ?? payload.priority;
  const statusLabel   = STATUS_LABELS[payload.status as keyof typeof STATUS_LABELS] ?? payload.status;
  const priorityColor = PRIORITY_COLOR[payload.priority] ?? "#6b7280";
  const dueDateStr    = payload.dueDate
    ? new Date(payload.dueDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const descriptionHtml = payload.description
    ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-left:3px solid #4f46e5;border-radius:4px;font-size:13px;color:#374151;white-space:pre-wrap">${payload.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#111827">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;color:#fff;font-size:18px">Issue Assigned to You</h2>
        <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px">${payload.issueCode} · ${payload.projectName}</p>
      </div>

      <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Hi <strong>${payload.assigneeName}</strong>,</p>
        <p style="margin:0 0 16px;color:#6b7280">คุณได้รับมอบหมาย issue ใน <strong style="color:#111827">${payload.projectName}</strong></p>

        <table style="border-collapse:collapse;width:100%;margin-bottom:8px;font-size:13px">
          ${row("Issue ID", `<strong>${payload.issueCode}</strong>`)}
          ${row("Title", `<strong>${payload.issueTitle}</strong>`)}
          ${row("Project", payload.projectName)}
          ${row("Priority", `<span style="color:${priorityColor};font-weight:600">${priorityLabel}</span>`)}
          ${row("Status", statusLabel)}
          ${payload.client     ? row("Client",     payload.client)     : ""}
          ${payload.department ? row("Department", payload.department) : ""}
          ${payload.module     ? row("Module",     payload.module)     : ""}
          ${dueDateStr         ? row("Due Date",   `<span style="color:#dc2626">${dueDateStr}</span>`) : ""}
        </table>

        ${descriptionHtml}

        <div style="margin-top:24px">
          <a href="${payload.issueUrl}"
             style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            View Issue →
          </a>
        </div>

        <p style="margin-top:28px;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;padding-top:16px">
          Issue Tracker · This is an automated notification
        </p>
      </div>
    </div>
  `;

  const bcc = await getGroupBcc([payload.to]);
  await transporter.sendMail({
    from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
    to: payload.to,
    bcc: bcc.join(","),
    subject: `[${payload.issueCode}] You have been assigned — ${payload.issueTitle}`,
    html,
  });
}

export async function sendWaitForCheckEmail(payload: WaitForCheckEmailPayload) {
  const cfg = await getConfigs([
    "email.enabled", "email.smtpHost", "email.smtpPort",
    "email.smtpSecure", "email.smtpUser", "email.smtpPass",
    "email.fromName", "email.fromEmail",
  ]);

  if (cfg["email.enabled"] !== "true") return;
  if (!cfg["email.smtpHost"]) return;

  const transporter = nodemailer.createTransport({
    host: cfg["email.smtpHost"],
    port: Number(cfg["email.smtpPort"] || 587),
    secure: cfg["email.smtpSecure"] === "true",
    auth: cfg["email.smtpUser"]
      ? { user: cfg["email.smtpUser"], pass: cfg["email.smtpPass"] }
      : undefined,
  });

  const priorityLabel = PRIORITY_LABELS[payload.priority as keyof typeof PRIORITY_LABELS] ?? payload.priority;
  const priorityColor = PRIORITY_COLOR[payload.priority] ?? "#6b7280";
  const dueDateStr    = payload.dueDate
    ? new Date(payload.dueDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const solutionHtml = payload.solution
    ? `<div style="margin-top:20px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">Solution / วิธีแก้ไข</p>
        <div style="padding:14px 16px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;font-size:13px;color:#166534;white-space:pre-wrap">${payload.solution.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#111827">
      <div style="background:#0d9488;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;color:#fff;font-size:18px">รอการตรวจสอบจากคุณ</h2>
        <p style="margin:4px 0 0;color:#99f6e4;font-size:13px">${payload.issueCode} · ${payload.projectName}</p>
      </div>

      <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Hi <strong>${payload.creatorName}</strong>,</p>
        <p style="margin:0 0 16px;color:#6b7280">
          Issue ของคุณได้รับการแก้ไขแล้ว กรุณาตรวจสอบ Solution และยืนยันผล
        </p>

        <table style="border-collapse:collapse;width:100%;margin-bottom:8px;font-size:13px">
          ${row("Issue ID",  `<strong>${payload.issueCode}</strong>`)}
          ${row("Title",     `<strong>${payload.issueTitle}</strong>`)}
          ${row("Project",   payload.projectName)}
          ${row("Priority",  `<span style="color:${priorityColor};font-weight:600">${priorityLabel}</span>`)}
          ${row("Status",    `<span style="color:#0d9488;font-weight:600">${STATUS_LABELS["wait_for_user_check"]}</span>`)}
          ${payload.client     ? row("Client",     payload.client)     : ""}
          ${payload.department ? row("Department", payload.department) : ""}
          ${payload.module     ? row("Module",     payload.module)     : ""}
          ${dueDateStr         ? row("Due Date",   `<span style="color:#dc2626">${dueDateStr}</span>`) : ""}
        </table>

        ${solutionHtml}

        <div style="margin-top:24px">
          <a href="${payload.issueUrl}"
             style="display:inline-block;padding:10px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            ดู Issue →
          </a>
        </div>

        <p style="margin-top:28px;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;padding-top:16px">
          Issue Tracker · This is an automated notification
        </p>
      </div>
    </div>
  `;

  const bcc = await getGroupBcc([payload.to]);
  await transporter.sendMail({
    from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
    to: payload.to,
    bcc: bcc.join(","),
    subject: `[${payload.issueCode}] รอการตรวจสอบ — ${payload.issueTitle}`,
    html,
  });
}

export async function sendCommentEmail(payload: CommentEmailPayload) {
  const cfg = await getConfigs([
    "email.enabled", "email.smtpHost", "email.smtpPort",
    "email.smtpSecure", "email.smtpUser", "email.smtpPass",
    "email.fromName", "email.fromEmail",
  ]);

  if (cfg["email.enabled"] !== "true") return;
  if (!cfg["email.smtpHost"]) return;

  const transporter = nodemailer.createTransport({
    host: cfg["email.smtpHost"],
    port: Number(cfg["email.smtpPort"] || 587),
    secure: cfg["email.smtpSecure"] === "true",
    auth: cfg["email.smtpUser"]
      ? { user: cfg["email.smtpUser"], pass: cfg["email.smtpPass"] }
      : undefined,
  });

  const commentHtml = payload.commentContent
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#111827">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;color:#fff;font-size:18px">New Comment</h2>
        <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px">${payload.issueCode} · ${payload.projectName}</p>
      </div>

      <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Hi <strong>${payload.recipientName}</strong>,</p>
        <p style="margin:0 0 16px;color:#6b7280">
          <strong style="color:#111827">${payload.commenterName}</strong>
          ได้แสดงความคิดเห็นใน issue ของคุณ
        </p>

        <table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px">
          ${row("Issue ID", `<strong>${payload.issueCode}</strong>`)}
          ${row("Title",    `<strong>${payload.issueTitle}</strong>`)}
          ${row("Project",  payload.projectName)}
        </table>

        <div style="padding:14px 16px;background:#f5f3ff;border-left:4px solid #4f46e5;border-radius:4px;font-size:13px;color:#1e1b4b;line-height:1.6">
          ${commentHtml}
        </div>

        <div style="margin-top:24px">
          <a href="${payload.issueUrl}"
             style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            ดู Issue →
          </a>
        </div>

        <p style="margin-top:28px;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;padding-top:16px">
          Issue Tracker · This is an automated notification
        </p>
      </div>
    </div>
  `;

  const bcc = await getGroupBcc([payload.to]);
  await transporter.sendMail({
    from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
    to: payload.to,
    bcc: bcc.join(","),
    subject: `[${payload.issueCode}] New Comment — ${payload.issueTitle}`,
    html,
  });
}

export async function sendResolvedEmail(payload: ResolvedEmailPayload) {
  const cfg = await getConfigs([
    "email.enabled", "email.smtpHost", "email.smtpPort",
    "email.smtpSecure", "email.smtpUser", "email.smtpPass",
    "email.fromName", "email.fromEmail",
  ]);

  if (cfg["email.enabled"] !== "true") return;
  if (!cfg["email.smtpHost"]) return;

  const transporter = nodemailer.createTransport({
    host: cfg["email.smtpHost"],
    port: Number(cfg["email.smtpPort"] || 587),
    secure: cfg["email.smtpSecure"] === "true",
    auth: cfg["email.smtpUser"]
      ? { user: cfg["email.smtpUser"], pass: cfg["email.smtpPass"] }
      : undefined,
  });

  const priorityLabel = PRIORITY_LABELS[payload.priority as keyof typeof PRIORITY_LABELS] ?? payload.priority;
  const priorityColor = PRIORITY_COLOR[payload.priority] ?? "#6b7280";
  const dueDateStr    = payload.dueDate
    ? new Date(payload.dueDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const solutionHtml = payload.solution
    ? `<div style="margin-top:20px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">Solution / วิธีแก้ไข</p>
        <div style="padding:14px 16px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;font-size:13px;color:#166534;white-space:pre-wrap">${payload.solution.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#111827">
      <div style="background:#16a34a;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;color:#fff;font-size:18px">Issue Resolved ✓</h2>
        <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px">${payload.issueCode} · ${payload.projectName}</p>
      </div>

      <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Hi <strong>${payload.creatorName}</strong>,</p>
        <p style="margin:0 0 16px;color:#6b7280">
          Issue ของคุณได้รับการ <strong style="color:#16a34a">Resolve</strong> แล้ว
        </p>

        <table style="border-collapse:collapse;width:100%;margin-bottom:8px;font-size:13px">
          ${row("Issue ID",  `<strong>${payload.issueCode}</strong>`)}
          ${row("Title",     `<strong>${payload.issueTitle}</strong>`)}
          ${row("Project",   payload.projectName)}
          ${row("Priority",  `<span style="color:${priorityColor};font-weight:600">${priorityLabel}</span>`)}
          ${row("Status",    `<span style="color:#16a34a;font-weight:600">${STATUS_LABELS["resolved"]}</span>`)}
          ${payload.client     ? row("Client",     payload.client)     : ""}
          ${payload.department ? row("Department", payload.department) : ""}
          ${payload.module     ? row("Module",     payload.module)     : ""}
          ${dueDateStr         ? row("Due Date",   `<span style="color:#dc2626">${dueDateStr}</span>`) : ""}
        </table>

        ${solutionHtml}

        <div style="margin-top:24px">
          <a href="${payload.issueUrl}"
             style="display:inline-block;padding:10px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            ดู Issue →
          </a>
        </div>

        <p style="margin-top:28px;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;padding-top:16px">
          Issue Tracker · This is an automated notification
        </p>
      </div>
    </div>
  `;

  const bcc = await getGroupBcc([payload.to]);
  await transporter.sendMail({
    from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
    to: payload.to,
    bcc: bcc.join(","),
    subject: `[${payload.issueCode}] Issue Resolved — ${payload.issueTitle}`,
    html,
  });
}

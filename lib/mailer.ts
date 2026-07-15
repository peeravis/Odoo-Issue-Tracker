import nodemailer from "nodemailer";
import { getConfigs } from "./config";

export async function sendAssignmentEmail({
  to,
  assigneeName,
  issueTitle,
  issueCode,
  issueUrl,
  projectName,
}: {
  to: string;
  assigneeName: string;
  issueTitle: string;
  issueCode: string;
  issueUrl: string;
  projectName: string;
}) {
  const cfg = await getConfigs([
    "email.enabled",
    "email.smtpHost",
    "email.smtpPort",
    "email.smtpSecure",
    "email.smtpUser",
    "email.smtpPass",
    "email.fromName",
    "email.fromEmail",
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

  await transporter.sendMail({
    from: `"${cfg["email.fromName"]}" <${cfg["email.fromEmail"]}>`,
    to,
    subject: `[${issueCode}] You have been assigned an issue — ${issueTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Issue Assigned to You</h2>
        <p>Hi <strong>${assigneeName}</strong>,</p>
        <p>You have been assigned to the following issue in <strong>${projectName}</strong>:</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;width:120px">Issue</td>
            <td style="padding:8px;border:1px solid #e5e7eb"><strong>${issueCode}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Title</td>
            <td style="padding:8px;border:1px solid #e5e7eb">${issueTitle}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Project</td>
            <td style="padding:8px;border:1px solid #e5e7eb">${projectName}</td>
          </tr>
        </table>
        <a href="${issueUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">
          View Issue →
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">Issue Tracker · This is an automated notification</p>
      </div>
    `,
  });
}

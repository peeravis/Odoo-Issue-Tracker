import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

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
  if (!process.env.SMTP_HOST) return; // Skip if not configured

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@issuetracker.local",
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

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getConfigs, CONFIG_DEFAULTS } from "@/lib/config";
import { saveAppConfig, saveEmailConfig, saveIssueDefaults } from "@/app/actions/config";
import { TestEmailButton } from "@/components/config/test-email-button";
import { FadeUp } from "@/components/ui/motion";
import { Settings, Mail, Bug, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";

const TABS = [
  { key: "app", label: "App Settings", icon: Settings },
  { key: "email", label: "Email / SMTP", icon: Mail },
  { key: "issues", label: "Issue Defaults", icon: Bug },
  { key: "roles", label: "Roles & Permissions", icon: Shield },
] as const;

type Tab = typeof TABS[number]["key"];

const ROLE_MATRIX = [
  { feature: "เข้าถึง Dashboard", admin: true, pm: false, member: false, other: false },
  { feature: "ดู Projects ทั้งหมด", admin: true, pm: true, member: false, other: false },
  { feature: "สร้าง/แก้ไข Project", admin: true, pm: true, member: false, other: false },
  { feature: "ดู Issues ทั้งหมด", admin: true, pm: true, member: false, other: false },
  { feature: "สร้าง Issue", admin: true, pm: true, member: true, other: false },
  { feature: "แก้ไข Issue", admin: true, pm: true, member: true, other: false },
  { feature: "Export Issues", admin: true, pm: true, member: true, other: false },
  { feature: "จัดการ Master Data", admin: true, pm: false, member: false, other: false },
  { feature: "จัดการ Users", admin: true, pm: false, member: false, other: false },
  { feature: "Config Settings", admin: true, pm: false, member: false, other: false },
];

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/projects");

  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "app") as Tab;
  const saved = sp.saved === "1";

  const cfg = await getConfigs(Object.keys(CONFIG_DEFAULTS));

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeUp>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Config</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ตั้งค่าระบบ</p>
        </div>
      </FadeUp>

      {saved && (
        <FadeUp>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            บันทึกการตั้งค่าเรียบร้อยแล้ว
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.03}>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/config?tab=${key}`}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={0.06}>
        {tab === "app" && (
          <Section title="App Settings" description="ชื่อแอปและ URL หลักที่ใช้ในอีเมลและ link ต่างๆ">
            <form action={saveAppConfig} className="space-y-4">
              <Field label="ชื่อแอป" name="app.name" defaultValue={cfg["app.name"]} placeholder="Issue Tracker" />
              <Field label="Base URL" name="app.baseUrl" defaultValue={cfg["app.baseUrl"]} placeholder="https://your-domain.com" />
              <p className="text-xs text-gray-400">Base URL ใช้ใน link ที่ส่งในอีเมล notification</p>
              <SaveButton />
            </form>
          </Section>
        )}

        {tab === "email" && (
          <Section title="Email / SMTP" description="ตั้งค่าการส่งอีเมล notification เมื่อมีการ assign issue">
            <form action={saveEmailConfig} className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">เปิด/ปิดการส่ง email เมื่อมีการ assign issue</p>
                </div>
                <select name="email.enabled" defaultValue={cfg["email.enabled"]} className="input-base w-28">
                  <option value="true">เปิด</option>
                  <option value="false">ปิด</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="SMTP Host" name="email.smtpHost" defaultValue={cfg["email.smtpHost"]} placeholder="smtp.gmail.com" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Port" name="email.smtpPort" defaultValue={cfg["email.smtpPort"]} placeholder="587" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Secure (SSL)</label>
                    <select name="email.smtpSecure" defaultValue={cfg["email.smtpSecure"]} className="input-base w-full">
                      <option value="false">STARTTLS</option>
                      <option value="true">SSL/TLS</option>
                    </select>
                  </div>
                </div>
                <Field label="SMTP User" name="email.smtpUser" defaultValue={cfg["email.smtpUser"]} placeholder="user@gmail.com" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SMTP Password</label>
                  <input
                    type="password"
                    name="email.smtpPass"
                    defaultValue={cfg["email.smtpPass"] ? "••••••••" : ""}
                    placeholder="App password หรือ SMTP password"
                    className="input-base w-full"
                  />
                  {cfg["email.smtpPass"] && <p className="text-xs text-gray-400 mt-1">มีรหัสผ่านบันทึกอยู่แล้ว — เว้นว่างเพื่อคงไว้</p>}
                </div>
                <Field label="From Name" name="email.fromName" defaultValue={cfg["email.fromName"]} placeholder="Issue Tracker" />
                <Field label="From Email" name="email.fromEmail" defaultValue={cfg["email.fromEmail"]} placeholder="noreply@yourdomain.com" />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <SaveButton />
                <TestEmailButton />
              </div>
            </form>
          </Section>
        )}

        {tab === "issues" && (
          <Section title="Issue Defaults" description="ค่า default ที่ใช้เมื่อสร้าง issue ใหม่">
            <form action={saveIssueDefaults} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Priority</label>
                  <select name="issue.defaultPriority" defaultValue={cfg["issue.defaultPriority"]} className="input-base w-full">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Status</label>
                  <select name="issue.defaultStatus" defaultValue={cfg["issue.defaultStatus"]} className="input-base w-full">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
              </div>
              <SaveButton />
            </form>
          </Section>
        )}

        {tab === "roles" && (
          <Section title="Roles & Permissions" description="ภาพรวมสิทธิ์การใช้งานของแต่ละ role ในระบบ (read-only)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Feature</th>
                    {["admin", "pm", "member", "rnao / co / gl"].map((r) => (
                      <th key={r} className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {ROLE_MATRIX.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{row.feature}</td>
                      <td className="py-3 px-3 text-center">{row.admin ? <Check /> : <Cross />}</td>
                      <td className="py-3 px-3 text-center">{row.pm ? <Check /> : <Cross />}</td>
                      <td className="py-3 px-3 text-center">{row.member ? <Check /> : <Cross />}</td>
                      <td className="py-3 px-3 text-center">{row.other ? <Check /> : <Cross />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              * rnao / co / gl สามารถดู Projects ทั้งหมดได้ แต่เข้าถึงผ่าน project member เท่านั้น
              · Role เหล่านี้ไม่สามารถสร้างหรือแก้ไข issues ได้
            </p>
          </Section>
        )}
      </FadeUp>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="input-base w-full" />
    </div>
  );
}

function SaveButton() {
  return (
    <button type="submit" className="btn-primary">
      บันทึก
    </button>
  );
}

function Check() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>;
}

function Cross() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-300 dark:text-gray-600 text-xs font-bold">–</span>;
}

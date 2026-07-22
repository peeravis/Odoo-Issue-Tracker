import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getConfigs, CONFIG_DEFAULTS } from "@/lib/config";
import { saveAppConfig, saveEmailConfig, saveIssueDefaults, removeLogo, saveRolePermissions, createRole, deleteRole } from "@/app/actions/config";
import { TestEmailButton } from "@/components/config/test-email-button";
import { LogoUploadForm } from "@/components/config/logo-upload-form";
import { FadeUp } from "@/components/ui/motion";
import { Settings, Mail, Bug, Shield, CheckCircle, Upload, X, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { getAllRoles, PERM_KEYS, PERM_LABELS } from "@/lib/permissions";
import { getPermissions } from "@/lib/permissions";

const TABS = [
  { key: "app", label: "App Settings", icon: Settings },
  { key: "email", label: "Email / SMTP", icon: Mail },
  { key: "issues", label: "Issue Defaults", icon: Bug },
  { key: "roles", label: "Roles & Permissions", icon: Shield },
] as const;

type Tab = typeof TABS[number]["key"];

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userPerms = await getPermissions(session.role);
  if (!userPerms.canAccessConfig) redirect("/projects");

  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "app") as Tab;
  const saved = sp.saved === "1";

  const [cfg, allRoles] = await Promise.all([
    getConfigs(Object.keys(CONFIG_DEFAULTS)),
    getAllRoles(),
  ]);

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
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/config?tab=${key}`}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                tab === key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={0.06}>
        {tab === "app" && (
          <Section title="App Settings" description="ชื่อแอป, URL หลัก, logo และการตั้งค่าทั่วไป">
            {/* Logo upload */}
            <div className="space-y-3 pb-5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo</p>
              <div className="flex items-center gap-4">
                {cfg["app.logoUrl"] ? (
                  <div className="relative h-16 w-16 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cfg["app.logoUrl"]} alt="App Logo" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="space-y-2">
                  <LogoUploadForm hasLogo={!!cfg["app.logoUrl"]} />
                  {cfg["app.logoUrl"] && (
                    <form action={removeLogo}>
                      <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                        <X className="h-3 w-3" /> ลบ Logo
                      </button>
                    </form>
                  )}
                  <p className="text-xs text-gray-400">PNG, JPG, SVG, WebP · ไม่เกิน 2 MB</p>
                </div>
              </div>
            </div>

            <form action={saveAppConfig} className="space-y-4">
              <Field label="ชื่อแอป" name="app.name" defaultValue={cfg["app.name"]} placeholder="Issue Tracker" />
              <Field label="Base URL" name="app.baseUrl" defaultValue={cfg["app.baseUrl"]} placeholder="https://your-domain.com" />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Session Timeout (นาที)</label>
                <input name="app.sessionTimeout" defaultValue={cfg["app.sessionTimeout"] || "480"} placeholder="480" type="number" min="15" max="10080" className="input-base w-40" />
                <p className="text-xs text-gray-400 mt-1">ระยะเวลาที่ session หมดอายุหลังจาก login · ค่า default 480 นาที (8 ชั่วโมง)</p>
              </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Section title="Roles & Permissions" description="แก้ไขสิทธิ์การใช้งานของแต่ละ role และเพิ่ม role ใหม่">
            <form action={saveRolePermissions}>
              <input type="hidden" name="roleNames" value={allRoles.map((r) => r.name).join(",")} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">สิทธิ์</th>
                      {allRoles.map((role) => (
                        <th key={role.name} className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[90px]">
                          <div className="flex flex-col items-center gap-1">
                            {role.isSystem ? (
                              <span className="font-bold text-gray-700 dark:text-gray-300">{role.name}</span>
                            ) : (
                              <input
                                type="text"
                                name={`label_${role.name}`}
                                defaultValue={role.label}
                                className="input-base w-20 text-center text-xs py-0.5 px-1"
                              />
                            )}
                            {role.isSystem && (
                              <input type="hidden" name={`label_${role.name}`} value={role.label} />
                            )}
                            {!role.isSystem && (
                              <form action={deleteRole.bind(null, role.name)}>
                                <button
                                  type="submit"
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                  title={`ลบ role ${role.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {PERM_KEYS.map((permKey) => (
                      <tr key={permKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 text-xs">{PERM_LABELS[permKey]}</td>
                        {allRoles.map((role) => (
                          <td key={role.name} className="py-2.5 px-2 text-center">
                            {role.name === "admin" ? (
                              // Admin always has all permissions — show locked check
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold" title="Admin มีสิทธิ์นี้เสมอ">✓</span>
                            ) : (
                              <input
                                type="checkbox"
                                name={`perm_${role.name}_${permKey}`}
                                defaultChecked={role.permissions[permKey]}
                                className="h-4 w-4 rounded accent-indigo-600"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="submit" className="btn-primary">บันทึก Permissions</button>
                <p className="text-xs text-gray-400">Admin มีสิทธิ์ทุกอย่างเสมอ ไม่สามารถแก้ไขได้</p>
              </div>
            </form>

            {/* Add new role */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                เพิ่ม Role ใหม่
              </h3>
              <form action={createRole} className="flex gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role Name (ตัวอักษรพิมพ์เล็ก ไม่มีช่องว่าง)</label>
                  <input
                    name="name"
                    placeholder="เช่น vendor"
                    required
                    pattern="[a-z0-9_]+"
                    title="ตัวอักษรพิมพ์เล็ก ตัวเลข หรือ _ เท่านั้น"
                    className="input-base w-40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Label (ชื่อแสดงผล)</label>
                  <input
                    name="label"
                    placeholder="เช่น Vendor"
                    required
                    className="input-base w-40"
                  />
                </div>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Plus className="h-4 w-4" /> เพิ่ม Role
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2">
                Role ใหม่จะมีสิทธิ์ canCreateIssues, canEditIssues, canExportIssues เป็น default — แก้ไขได้ในตารางด้านบน
              </p>
            </div>
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


import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "รหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  role: z.string().min(1, "กรุณาเลือก Role"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ Project"),
  code: z
    .string()
    .min(1, "กรุณากรอกรหัส Project")
    .max(10, "รหัสต้องไม่เกิน 10 ตัวอักษร")
    .regex(/^[A-Za-z0-9]+$/, "รหัสต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้น"),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ Project"),
  description: z.string().optional(),
  status: z.enum(["active", "closed"]),
});

export const createIssueSchema = z.object({
  projectId: z.string().min(1, "กรุณาเลือก Project"),
  title: z.string().min(1, "กรุณากรอกหัวข้อ Issue"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.string().min(1),
  dateReported: z.string().optional(),
  dueDate: z.string().optional(),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, "กรุณากรอก Comment"),
});

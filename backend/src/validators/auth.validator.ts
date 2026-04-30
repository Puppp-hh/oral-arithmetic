/**
 * 文件说明：认证接口 Zod Schema 定义（zod v4 兼容）
 * 系统作用：约束登录/注册接口的入参类型、范围、格式
 * 调用链：auth.routes → validate(schema) → auth.controller
 */
import { z } from "zod";

// ── 学生登录 ─────────────────────────────────────────────────
export const studentLoginSchema = z.object({
  account: z.string().min(1, "账号不能为空").max(50, "账号最长 50 位"),
  password: z.string().min(1, "密码不能为空").max(100, "密码最长 100 位"),
});

// ── 教师登录 ─────────────────────────────────────────────────
export const teacherLoginSchema = z.object({
  account: z.string().min(1, "账号不能为空").max(50, "账号最长 50 位"),
  password: z.string().min(1, "密码不能为空").max(100, "密码最长 100 位"),
});

// ── 学生注册 ─────────────────────────────────────────────────
export const studentRegisterSchema = z.object({
  account: z
    .string()
    .min(3, "账号至少 3 位")
    .max(50, "账号最长 50 位")
    .regex(/^[a-zA-Z0-9_]+$/, "账号只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少 6 位").max(100, "密码最长 100 位"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最长 50 位"),
  inviteCode: z
    .string()
    .min(4, "邀请码至少 4 位")
    .max(10, "邀请码最长 10 位")
    .toUpperCase(),
  gender: z.enum(["male", "female"]).optional(),
});

// ── 教师注册 ─────────────────────────────────────────────────
export const teacherRegisterSchema = z.object({
  account: z
    .string()
    .min(3, "账号至少 3 位")
    .max(50, "账号最长 50 位")
    .regex(/^[a-zA-Z0-9_]+$/, "账号只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少 6 位").max(100, "密码最长 100 位"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最长 50 位"),
  schoolName: z.string().min(1, "学校名称不能为空").max(100, "学校名称最长 100 位"),
  schoolAddress: z.string().max(255, "学校地址最长 255 位").optional().or(z.literal("")),
  schoolLongitude: z.number().min(-180).max(180).optional(),
  schoolLatitude: z.number().min(-90).max(90).optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式不正确")
    .optional()
    .or(z.literal("")),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
});

// ── 推断类型（供 controller 使用）────────────────────────────
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
export type TeacherLoginInput = z.infer<typeof teacherLoginSchema>;
export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;
export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;

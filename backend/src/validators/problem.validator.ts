/**
 * 文件说明：题目接口 Zod Schema 定义（zod v4 兼容）
 * 系统作用：约束出题/提交接口的入参类型、范围
 * 调用链：problem.routes → validate(schema) → problem.controller
 *
 * generateProblemsSchema 使用 z.coerce 将 query string 自动转为 number
 */
import { z } from 'zod';

// ── 出题（query 参数，字符串 coerce 为数字）────────────────
export const generateProblemsSchema = z.object({
  difficulty_level: z.coerce
    .number()
    .int('difficulty_level 必须为整数')
    .min(1, 'difficulty_level 范围 1-10')
    .max(10, 'difficulty_level 范围 1-10')
    .optional(),
  count: z.coerce
    .number()
    .int('count 必须为整数')
    .min(1, 'count 范围 1-20')
    .max(20, 'count 范围 1-20')
    .optional()
    .default(10),
  operation_type: z
    .enum(['addition', 'subtraction', 'multiplication', 'division', 'mixed'])
    .optional(),
});

// ── 提交答案（body 参数）────────────────────────────────────
export const submitAnswerSchema = z.object({
  problem_id: z.number().int('题目 ID 必须为整数').positive('题目 ID 必须为正整数'),
  answer_content: z.string().min(1, '答案不能为空').max(200, '答案最长 200 字符'),
  answer_time_seconds: z
    .number()
    .min(0, '答题时长不能为负数')
    .max(3600, '答题时长不能超过 3600 秒'),
  session_id: z.string().optional(),
  is_review: z.boolean().optional().default(false),
});

// ── 推断类型 ─────────────────────────────────────────────────
export type GenerateProblemsInput = z.infer<typeof generateProblemsSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

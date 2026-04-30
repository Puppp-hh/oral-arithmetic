/**
 * 文件说明：题目 controller
 * 系统作用：
 *   - generateProblems  出题（随机/按难度/按类型）
 *   - submitAnswer      提交答案 + 判题
 *   - getProblemById    查询单题详情（含解题步骤）
 *
 * 调用链：路由 → validate(Zod) → controller → problemService → DB/Redis
 * 参数校验已由 validate 中间件完成（见 problem.validator.ts）
 *
 * 接口：
 *   GET  /api/problems/generate              出题
 *   POST /api/problems/submit                提交答案
 *   GET  /api/problems/:id                   查单题详情
 */
import { Response } from 'express';
import { problemService } from '../services/problem.service';
import { success, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SubmitAnswerDto } from '../types';
import {
  type GenerateProblemsInput,
  type SubmitAnswerInput,
} from '../validators/problem.validator';

// ── 出题 ─────────────────────────────────────────────────────
export async function generateProblems(req: AuthRequest, res: Response): Promise<void> {
  // req.query 已由 validate(generateProblemsSchema, 'query') 解析并 coerce
  const { difficulty_level, count, operation_type } = req.query as unknown as GenerateProblemsInput;

  try {
    const problems = await problemService.generateProblems({
      difficulty_level,
      operation_type,
      count,
    });
    success(res, { count: problems.length, problems }, '出题成功');
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

// ── 提交答案 ─────────────────────────────────────────────────
export async function submitAnswer(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;

  if (req.user!.role !== 'student') {
    fail(res, '只有学生可以提交答案', 403, 403);
    return;
  }

  // req.body 已由 validate(submitAnswerSchema) 校验并填充默认值（is_review=false）
  const dto = req.body as SubmitAnswerInput & SubmitAnswerDto;

  try {
    const result = await problemService.submitAnswer(studentId, dto);
    const msg = result.is_correct
      ? result.level_changed
        ? `回答正确！恭喜升级到 Level ${result.new_level}！`
        : '回答正确！'
      : '回答错误，已加入错题本';
    success(res, result, msg);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

// ── 查单题详情 ────────────────────────────────────────────────
export async function getProblemById(req: AuthRequest, res: Response): Promise<void> {
  const problemId = Number(req.params.id);
  if (isNaN(problemId)) {
    fail(res, '无效的题目 ID');
    return;
  }
  try {
    const problem = await problemService.getProblemById(problemId);
    if (!problem) {
      fail(res, '题目不存在', 404, 404);
      return;
    }
    success(res, problem);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

/**
 * 文件说明：题目 controller（完整版）
 * 系统作用：
 *   - generateProblems  出题（随机/按难度/按类型）
 *   - submitAnswer      提交答案 + 判题
 *   - getProblemById    查询单题详情（含解题步骤）
 *
 * 调用链：路由 → controller（参数校验） → problemService → DB/Redis
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
import { GenerateProblemDto, OperationType, SubmitAnswerDto } from '../types';

// ── 出题 ─────────────────────────────────────────────────────
export async function generateProblems(req: AuthRequest, res: Response): Promise<void> {
  const level = req.query.difficulty_level ? Number(req.query.difficulty_level) : undefined;
  const count = req.query.count ? Number(req.query.count) : 10;
  const opType = req.query.operation_type as OperationType | undefined;

  if (level !== undefined && (isNaN(level) || level < 1 || level > 10)) {
    fail(res, 'difficulty_level 必须为 1-10 的整数');
    return;
  }

  const dto: GenerateProblemDto = { difficulty_level: level, operation_type: opType, count };

  try {
    const problems = await problemService.generateProblems(dto);
    success(res, { count: problems.length, problems }, '出题成功');
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

// ── 提交答案 ─────────────────────────────────────────────────
export async function submitAnswer(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;

  // 仅学生可以答题
  if (req.user!.role !== 'student') {
    fail(res, '只有学生可以提交答案', 403, 403);
    return;
  }

  const dto = req.body as SubmitAnswerDto;
  if (!dto.problem_id || dto.answer_content === undefined || !dto.answer_time_seconds) {
    fail(res, '缺少必填字段：problem_id / answer_content / answer_time_seconds');
    return;
  }
  if (dto.answer_time_seconds < 0 || dto.answer_time_seconds > 3600) {
    fail(res, 'answer_time_seconds 范围：0-3600');
    return;
  }

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

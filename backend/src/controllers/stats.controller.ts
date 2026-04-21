/**
 * 文件说明：统计 controller（完整版）
 * 系统作用：学生学习统计接口，包含总览/每日/最近20题
 * 调用链：路由 → statsController → statsService → DB
 *
 * 接口：
 *   GET /api/stats/summary    总览摘要
 *   GET /api/stats/daily      近N天每日统计
 *   GET /api/stats/recent20   最近20题详情
 */
import { Response } from 'express';
import { statsService } from '../services/stats.service';
import { success, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  if (req.user!.role !== 'student') {
    fail(res, '仅学生可查询统计', 403, 403);
    return;
  }
  try {
    const data = await statsService.getSummary(studentId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

export async function getDailyStats(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  if (req.user!.role !== 'student') {
    fail(res, '仅学生可查询统计', 403, 403);
    return;
  }
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  try {
    const data = await statsService.getDailyStats(studentId, days);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

export async function getRecent20(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  if (req.user!.role !== 'student') {
    fail(res, '仅学生可查询统计', 403, 403);
    return;
  }
  try {
    const data = await statsService.getRecent20(studentId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

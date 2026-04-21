/**
 * 文件说明：错题本 controller
 * 系统作用：查询、删除、标记改正错题
 * 调用链：路由 → mistakeController → mistakeService → mistake_book 表
 */
import { Response } from 'express';
import { mistakeService } from '../services/mistake.service';
import { success, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export async function getMistakes(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const isCorrectd = req.query.is_corrected !== undefined
    ? req.query.is_corrected === 'true'
    : undefined;
  try {
    const data = await mistakeService.getMistakes(studentId, page, pageSize, isCorrectd);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

export async function deleteMistake(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  const mistakeId = Number(req.params.id);
  try {
    await mistakeService.deleteMistake(studentId, mistakeId);
    success(res, null, '删除成功');
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

export async function markCorrected(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.user!.userId;
  const mistakeId = Number(req.params.id);
  try {
    await mistakeService.markCorrected(studentId, mistakeId);
    success(res, null, '已标记为改正');
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

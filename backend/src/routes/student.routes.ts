import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middlewares/auth.middleware';
import { studentService } from '../services/student.service';
import { success, fail } from '../utils/response';
import { z } from 'zod';

const bindInviteCodeSchema = z.object({
  inviteCode: z.string().min(4).max(10).toUpperCase(),
});

const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少 6 位').max(50, '新密码最长 50 位'),
});

const router = Router();

router.get('/info', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await studentService.getInfo(req.user!.userId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/level', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await studentService.getLevel(req.user!.userId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

// POST /api/student/bind-invite-code
router.post('/bind-invite-code', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = bindInviteCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, parsed.error.issues[0]?.message ?? '参数错误', 400, 400);
      return;
    }
    const data = await studentService.bindInviteCode(req.user!.userId, parsed.data.inviteCode);
    success(res, data, '绑定成功');
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

// POST /api/student/reset-password
router.post('/reset-password', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, parsed.error.issues[0]?.message ?? '参数错误', 400, 400);
      return;
    }
    await studentService.resetPassword(
      req.user!.userId,
      parsed.data.oldPassword,
      parsed.data.newPassword,
    );
    success(res, null, '密码已重置');
  } catch (e) {
    fail(res, (e as Error).message, 400, 400);
  }
});

export default router;

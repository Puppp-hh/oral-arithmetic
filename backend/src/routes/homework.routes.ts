import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middlewares/auth.middleware';
import { homeworkService } from '../services/homework.service';
import { success, fail } from '../utils/response';

const router = Router();

router.post('/', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await homeworkService.createHomework(req.user!.userId, req.body);
    success(res, data, '作业创建成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/teacher', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize } = req.query as Record<string, string>;
    const data = await homeworkService.getTeacherHomeworkList(
      req.user!.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/student', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, status } = req.query as Record<string, string>;
    const data = await homeworkService.getStudentHomeworkList(
      req.user!.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
      status,
    );
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/:id/completion', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await homeworkService.getHomeworkCompletion(Number(req.params.id));
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.post('/:id/submit', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const answers = Array.isArray(req.body?.answers)
      ? req.body.answers.reduce((acc: Record<string, string>, item: { problem_id: number; answer_content: string }) => {
          acc[String(item.problem_id)] = item.answer_content ?? '';
          return acc;
        }, {})
      : req.body?.answers ?? {};

    const data = await homeworkService.submitHomework(
      Number(req.params.id),
      req.user!.userId,
      answers,
    );
    success(res, data, '作业提交成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.userId : undefined;
    const data = await homeworkService.getHomeworkDetail(Number(req.params.id), studentId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message, 404, 404);
  }
});

export default router;

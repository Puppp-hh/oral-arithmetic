import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middlewares/auth.middleware';
import { examService } from '../services/exam.service';
import { success, fail } from '../utils/response';

const router = Router();

router.post('/paper', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.createExamPaper(req.user!.userId, req.body);
    success(res, data, '试卷创建成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/paper/:id', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.getExamPaperDetail(Number(req.params.id), req.user!.userId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message, 404, 404);
  }
});

router.post('/', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.createExam(req.user!.userId, req.body);
    success(res, data, '考试发布成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/teacher', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, status } = req.query as Record<string, string>;
    const data = await examService.getTeacherExamList(
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

router.get('/student', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, status } = req.query as Record<string, string>;
    const data = await examService.getStudentExamList(
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

router.get('/:id/stats', authMiddleware, requireRole('teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.getExamStats(Number(req.params.id), req.user!.userId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message, 404, 404);
  }
});

router.get('/:id/result', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.getExamResult(Number(req.params.id), req.user!.userId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message, 404, 404);
  }
});

router.post('/:id/submit', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await examService.submitExam(Number(req.params.id), req.user!.userId, req.body);
    success(res, data, '考试提交成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.userId : undefined;
    const data = await examService.getExamDetail(Number(req.params.id), studentId);
    success(res, data);
  } catch (e) {
    fail(res, (e as Error).message, 404, 404);
  }
});

export default router;

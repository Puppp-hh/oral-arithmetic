import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middlewares/auth.middleware';
import { teacherService } from '../services/teacher.service';
import { classService } from '../services/class.service';
import { success, fail } from '../utils/response';

const router = Router();

// 所有路由都需要 teacher 角色
router.use(authMiddleware, requireRole('teacher'));

// GET /api/teacher/info
router.get('/info', async (req: AuthRequest, res: Response) => {
  try {
    const data = await teacherService.getInfo(req.user!.userId);
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// GET /api/teacher/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.query as Record<string, string>;
    const data = await teacherService.getClassStats(
      req.user!.userId,
      classId ? Number(classId) : undefined,
    );
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// GET /api/teacher/students
router.get('/students', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, keyword, classId } = req.query as Record<string, string>;
    const data = await teacherService.getStudentList({
      teacherId: req.user!.userId,
      page:     Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
      classId: classId ? Number(classId) : undefined,
    });
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// GET /api/teacher/students/:id
router.get('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await teacherService.getStudentDetail(Number(req.params.id));
    success(res, data);
  } catch (e) { fail(res, (e as Error).message, 404, 404); }
});

// GET /api/teacher/students/:id/stats
router.get('/students/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const data = await teacherService.getStudentStats(Number(req.params.id));
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// POST /api/teacher/students/:id/reset-password
router.post('/students/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const data = await teacherService.resetStudentPassword(Number(req.params.id));
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// ── 邀请码快捷入口（主页展示用）────────────────────────────────

// GET /api/teacher/my-invite-code  返回教师第一个班级的邀请码
router.get('/my-invite-code', async (req: AuthRequest, res: Response) => {
  try {
    const classes = await classService.getTeacherClasses(req.user!.userId);
    const first = classes.find(c => c.invite_code);
    if (!first) {
      success(res, null, '暂无班级，请先创建班级');
      return;
    }
    success(res, {
      class_id:                first.class_id,
      class_name:              first.class_name,
      grade_name:              first.grade_name,
      invite_code:             first.invite_code,
      invite_code_status:      first.invite_code_status,
      invite_code_expire_time: first.invite_code_expire_time,
    });
  } catch (e) { fail(res, (e as Error).message); }
});

// ── 班级管理 ─────────────────────────────────────────────────

// POST /api/teacher/classes
router.post('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const { className, gradeId } = req.body as { className: string; gradeId: number };
    if (!className?.trim()) { fail(res, '班级名称不能为空', 400, 400); return; }
    if (!gradeId) { fail(res, '年级不能为空', 400, 400); return; }
    const data = await classService.createClass(req.user!.userId, { className: className.trim(), gradeId: Number(gradeId) });
    success(res, data, '班级创建成功', 201);
  } catch (e) { fail(res, (e as Error).message); }
});

// GET /api/teacher/classes
router.get('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const data = await classService.getTeacherClasses(req.user!.userId);
    success(res, data);
  } catch (e) { fail(res, (e as Error).message); }
});

// DELETE /api/teacher/classes/:id
router.delete('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    await classService.deleteClass(Number(req.params.id), req.user!.userId);
    success(res, null, '班级已删除');
  } catch (e) { fail(res, (e as Error).message, 400, 400); }
});

// GET /api/teacher/classes/:id/invite-code
router.get('/classes/:id/invite-code', async (req: AuthRequest, res: Response) => {
  try {
    const data = await classService.getInviteCode(Number(req.params.id), req.user!.userId);
    success(res, data);
  } catch (e) { fail(res, (e as Error).message, 403, 403); }
});

// PUT /api/teacher/classes/:id/invite-code
router.put('/classes/:id/invite-code', async (req: AuthRequest, res: Response) => {
  try {
    const data = await classService.refreshInviteCode(Number(req.params.id), req.user!.userId);
    success(res, data, '邀请码已重置');
  } catch (e) { fail(res, (e as Error).message, 403, 403); }
});

// GET /api/teacher/classes/:id/students
router.get('/classes/:id/students', async (req: AuthRequest, res: Response) => {
  try {
    const data = await classService.getClassStudents(Number(req.params.id), req.user!.userId);
    success(res, data);
  } catch (e) { fail(res, (e as Error).message, 403, 403); }
});

export default router;

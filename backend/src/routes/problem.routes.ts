/**
 * 文件说明：题目路由
 * 系统作用：出题 / 提交答案 / 查单题 的 URL 映射
 * 调用链：
 *   GET  /api/problems/generate    → generateProblems → problemService → DB/Redis
 *   POST /api/problems/submit      → submitAnswer     → problemService → DB (训练记录+错题本+统计)
 *   GET  /api/problems/:id         → getProblemById   → problemService → DB
 */
import { Router } from 'express';
import {
  generateProblems,
  submitAnswer,
  getProblemById,
} from '../controllers/problem.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/generate', authMiddleware, generateProblems);
router.post('/submit', authMiddleware, submitAnswer);
router.get('/:id', authMiddleware, getProblemById);

export default router;

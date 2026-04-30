/**
 * 文件说明：题目路由
 * 系统作用：出题 / 提交答案 / 查单题 的 URL 映射
 * 调用链：
 *   GET  /api/problems/generate    → authMiddleware → validate(query) → generateProblems → problemService → DB/Redis
 *   POST /api/problems/submit      → authMiddleware → validate(body)  → submitAnswer     → problemService → DB
 *   GET  /api/problems/:id         → authMiddleware → getProblemById  → problemService → Redis/DB
 */
import { Router } from 'express';
import {
  generateProblems,
  submitAnswer,
  getProblemById,
} from '../controllers/problem.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  generateProblemsSchema,
  submitAnswerSchema,
} from '../validators/problem.validator';

const router = Router();

// validate(generateProblemsSchema, 'query') 校验 query string 并 coerce 类型
router.get('/generate', authMiddleware, validate(generateProblemsSchema, 'query'), generateProblems);
// validate(submitAnswerSchema) 校验 body，校验失败直接返回 400，不进 controller
router.post('/submit', authMiddleware, validate(submitAnswerSchema), submitAnswer);
router.get('/:id', authMiddleware, getProblemById);

export default router;

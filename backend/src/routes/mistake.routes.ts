/**
 * 文件说明：错题本路由
 * 系统作用：查询、删除错题接口
 * 调用链：前端 → GET /api/mistakes → mistakeController → mistakeService → mistake_book 表
 */
import { Router } from 'express';
import { getMistakes, deleteMistake, markCorrected } from '../controllers/mistake.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMistakes);
router.delete('/:id', authMiddleware, deleteMistake);
router.put('/:id/corrected', authMiddleware, markCorrected);

export default router;

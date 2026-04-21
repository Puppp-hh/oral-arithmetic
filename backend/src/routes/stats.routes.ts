/**
 * 文件说明：统计路由
 * 系统作用：学习统计摘要 + 每日统计列表
 * 调用链：前端 → GET /api/stats/summary → statsController → statsService → DB
 */
import { Router } from 'express';
import { getSummary, getDailyStats, getRecent20 } from '../controllers/stats.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/summary', authMiddleware, getSummary);
router.get('/daily', authMiddleware, getDailyStats);
router.get('/recent20', authMiddleware, getRecent20);

export default router;

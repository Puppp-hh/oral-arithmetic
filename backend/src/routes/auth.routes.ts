/**
 * 文件说明：认证路由
 * 系统作用：定义所有认证相关接口路径，将 URL 映射到对应 controller
 * 调用链：前端 wx.request -> POST /api/auth/:role/login -> authController -> authService -> DB+Redis
 *
 * 路由总览：
 *   POST /api/auth/student/login     学生登录（无需 token）
 *   POST /api/auth/teacher/login     教师登录（无需 token）
 *   POST /api/auth/student/register  学生注册（无需 token）
 *   POST /api/auth/logout            登出（需 token）
 *   POST /api/auth/refresh           刷新 token（需旧 token）
 *   GET  /api/auth/token-info        查询 token 剩余 TTL（需 token）
 */
import { Router } from 'express';
import {
  studentLogin,
  teacherLogin,
  studentRegister,
  logout,
  refreshToken,
  getTokenInfo,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// 公开接口（无需 token）
router.post('/student/login', studentLogin);
router.post('/teacher/login', teacherLogin);
router.post('/student/register', studentRegister);

// 需要认证的接口
router.post('/logout', authMiddleware, logout);
router.post('/refresh', refreshToken);           // 自行提取旧 token，不走 authMiddleware
router.get('/token-info', authMiddleware, getTokenInfo);

export default router;

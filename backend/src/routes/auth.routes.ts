/**
 * 文件说明：认证路由
 * 系统作用：定义所有认证相关接口路径，将 URL 映射到对应 controller
 * 调用链：前端 wx.request -> POST /api/auth/:role/login -> validate -> authController -> authService -> DB+Redis
 *
 * 路由总览：
 *   POST /api/auth/student/login     学生登录（无需 token）
 *   POST /api/auth/teacher/login     教师登录（无需 token）
 *   POST /api/auth/student/register  学生注册（无需 token）
 *   POST /api/auth/logout            登出（需 token）
 *   POST /api/auth/refresh           刷新 token（需旧 token）
 *   GET  /api/auth/token-info        查询 token 剩余 TTL（需 token）
 */
import { Router } from "express";
import {
  studentLogin,
  teacherLogin,
  studentRegister,
  teacherRegister,
  logout,
  refreshToken,
  getTokenInfo,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  studentLoginSchema,
  teacherLoginSchema,
  studentRegisterSchema,
  teacherRegisterSchema,
} from "../validators/auth.validator";

const router = Router();

// 公开接口（无需 token）— validate 中间件在 controller 前拦截非法参数
router.post("/student/login", validate(studentLoginSchema), studentLogin);
router.post("/teacher/login", validate(teacherLoginSchema), teacherLogin);
router.post("/student/register", validate(studentRegisterSchema), studentRegister);
router.post("/teacher/register", validate(teacherRegisterSchema), teacherRegister);

// 需要认证的接口
// authMiddleware 在 controller 前验证 token，拒绝未授权访问
router.post("/logout", authMiddleware, logout);

// 自行提取旧 token，不走 authMiddleware
router.post("/refresh", refreshToken);

// 查询 token 剩余 TTL，供前端定时刷新使用
router.get("/token-info", authMiddleware, getTokenInfo);

export default router;

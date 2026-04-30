/**
 * 文件说明：认证 controller
 * 系统作用：处理登录、注册、登出、token 刷新、token 信息查询
 * 调用链：router → validate(Zod) → controller → authService → 返回响应
 *
 * 参数校验已由 validate 中间件完成（见 auth.validator.ts），
 * controller 只负责调用 service 并格式化响应。
 *
 * 接口列表：
 *   POST /api/auth/student/login     学生登录
 *   POST /api/auth/teacher/login     教师登录
 *   POST /api/auth/student/register  学生注册
 *   POST /api/auth/logout            登出（需 token）
 *   POST /api/auth/refresh           刷新 token（需旧 token）
 *   GET  /api/auth/token-info        查询 token 信息（需 token）
 */
import { Request, Response } from 'express';
import { authService, StudentRegisterDto, TeacherRegisterDto } from '../services/auth.service';
import { success, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { redisService } from '../services/redis.service';
import {
  type StudentLoginInput,
  type StudentRegisterInput,
  type TeacherRegisterInput,
} from '../validators/auth.validator';

// ── 学生登录 ─────────────────────────────────────────────────
export async function studentLogin(req: Request, res: Response): Promise<void> {
  // req.body 已由 validate(studentLoginSchema) 校验并类型安全
  const { account, password } = req.body as StudentLoginInput;
  try {
    const result = await authService.studentLogin(account, password);
    success(res, result, '登录成功');
  } catch (e) {
    fail(res, (e as Error).message, 401, 401);
  }
}

// ── 教师登录 ─────────────────────────────────────────────────
export async function teacherLogin(req: Request, res: Response): Promise<void> {
  const { account, password } = req.body as StudentLoginInput;
  try {
    const result = await authService.teacherLogin(account, password);
    success(res, result, '登录成功');
  } catch (e) {
    fail(res, (e as Error).message, 401, 401);
  }
}

// ── 学生注册 ─────────────────────────────────────────────────
export async function studentRegister(req: Request, res: Response): Promise<void> {
  const dto = req.body as StudentRegisterInput & StudentRegisterDto;
  try {
    const userInfo = await authService.studentRegister(dto);
    success(res, userInfo, '注册成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

// ── 教师注册 ─────────────────────────────────────────────────
export async function teacherRegister(req: Request, res: Response): Promise<void> {
  const dto = req.body as TeacherRegisterInput & TeacherRegisterDto;
  try {
    const userInfo = await authService.teacherRegister(dto);
    success(res, userInfo, '注册成功', 201);
  } catch (e) {
    fail(res, (e as Error).message);
  }
}

// ── 登出 ─────────────────────────────────────────────────────
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  await redisService.deleteToken(user.userId, user.role);
  success(res, null, '已退出登录');
}

// ── Token 刷新（换发新 token，旧 token 立即失效） ─────────────
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, '未提供 token', 401, 401);
    return;
  }
  const oldToken = authHeader.slice(7);
  try {
    const result = await authService.refreshToken(oldToken);
    success(res, result, 'token 刷新成功');
  } catch (e) {
    fail(res, (e as Error).message, 401, 401);
  }
}

// ── 查询 token 信息（剩余 TTL）────────────────────────────────
export async function getTokenInfo(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  const info = await authService.getTokenInfo(user.userId, user.role);
  if (!info) {
    fail(res, 'token 信息不存在', 404, 404);
    return;
  }
  success(res, info);
}

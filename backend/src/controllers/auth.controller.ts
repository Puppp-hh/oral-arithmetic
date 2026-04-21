/**
 * 文件说明：认证 controller（完整版）
 * 系统作用：处理登录、注册、登出、token 刷新、token 信息查询
 * 调用链：router → controller（参数校验） → authService（业务） → 返回响应
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
import { authService, StudentRegisterDto } from '../services/auth.service';
import { success, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { redisService } from '../services/redis.service';

// ── 学生登录 ─────────────────────────────────────────────────
export async function studentLogin(req: Request, res: Response): Promise<void> {
  const { account, password } = req.body as { account: string; password: string };
  if (!account || !password) {
    fail(res, '账号和密码不能为空');
    return;
  }
  try {
    const result = await authService.studentLogin(account, password);
    success(res, result, '登录成功');
  } catch (e) {
    fail(res, (e as Error).message, 401, 401);
  }
}

// ── 教师登录 ─────────────────────────────────────────────────
export async function teacherLogin(req: Request, res: Response): Promise<void> {
  const { account, password } = req.body as { account: string; password: string };
  if (!account || !password) {
    fail(res, '账号和密码不能为空');
    return;
  }
  try {
    const result = await authService.teacherLogin(account, password);
    success(res, result, '登录成功');
  } catch (e) {
    fail(res, (e as Error).message, 401, 401);
  }
}

// ── 学生注册 ─────────────────────────────────────────────────
export async function studentRegister(req: Request, res: Response): Promise<void> {
  const dto = req.body as StudentRegisterDto;
  if (!dto.account || !dto.password || !dto.name || !dto.class_id || !dto.grade_id) {
    fail(res, '缺少必填字段：account / password / name / class_id / grade_id');
    return;
  }
  if (dto.password.length < 6) {
    fail(res, '密码长度不能少于 6 位');
    return;
  }
  try {
    const userInfo = await authService.studentRegister(dto);
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

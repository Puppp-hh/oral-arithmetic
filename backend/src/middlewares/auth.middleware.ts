/**
 * 文件说明：JWT 认证中间件（含滑动过期）
 * 系统作用：
 *   1. 从 Authorization: Bearer <token> 提取 token
 *   2. verifyToken 验证 JWT 签名和过期
 *   3. 去 Redis 比对 token（防止主动登出后仍可用）
 *   4. 验证通过后刷新 TTL（滑动过期，活跃用户不被踢出）
 *   5. 将 payload 注入 req.user
 *
 * 调用链：请求 → authMiddleware → 通过 → controller
 *                              → 失败 → 401/403
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { redisService } from '../services/redis.service';
import { fail } from '../utils/response';
import { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, '未提供认证 token', 401, 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Step 1: 验证 JWT 签名 + 过期时间
    const payload = verifyToken(token);

    // Step 2: 校验 Redis 中存储的 token 是否一致（防止登出后复用）
    const isValid = await redisService.validateToken(payload.userId, payload.role, token);
    if (!isValid) {
      fail(res, 'token 已失效，请重新登录', 401, 401);
      return;
    }

    // Step 3: 滑动过期 —— 每次有效请求重置 TTL
    await redisService.refreshTokenTTL(payload.userId, payload.role);

    req.user = payload;
    next();
  } catch {
    fail(res, 'token 无效或已过期', 401, 401);
  }
}

export function requireRole(role: 'student' | 'teacher') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      fail(res, '权限不足', 403, 403);
      return;
    }
    next();
  };
}

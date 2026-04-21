/**
 * 文件说明：JWT 签发与验证工具
 * 系统作用：封装 jsonwebtoken 的 sign / verify，统一错误处理
 * 调用链：auth.service → signToken → JWT字符串 → Redis存储
 *         auth.middleware → verifyToken → payload → 注入 req.user
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';
import { JwtPayload } from '../types';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

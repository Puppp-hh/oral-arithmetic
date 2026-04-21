/**
 * 文件说明：Redis 封装服务
 * 系统作用：集中管理所有 Redis 操作，分为 token 管理和通用缓存两类
 *          不允许其他模块直接 import redisClient 操作，统一走此 service
 *
 * Key 规范：
 *   token:    token:{userId}_{role}       → 值为 JWT 字符串，EX = TOKEN_EXPIRES_IN
 *   problems: problems:level:{n}:type:{t} → 值为 JSON 题目数组，EX = 300s
 *
 * 调用链：
 *   authService      → redisService.setToken / getToken / deleteToken
 *   authMiddleware   → redisService.getToken / refreshToken
 *   problemService   → redisService.getCache / setCache
 */
import { redisClient } from '../config/redis';
import { TOKEN_PREFIX, TOKEN_EXPIRES_IN } from '../config/jwt';

export const redisService = {
  // ── Token 管理 ─────────────────────────────────────────

  tokenKey(userId: number, role: string): string {
    return `${TOKEN_PREFIX}${userId}_${role}`;
  },

  async setToken(userId: number, role: string, token: string): Promise<void> {
    await redisClient.set(this.tokenKey(userId, role), token, 'EX', TOKEN_EXPIRES_IN);
  },

  async getToken(userId: number, role: string): Promise<string | null> {
    return redisClient.get(this.tokenKey(userId, role));
  },

  async deleteToken(userId: number, role: string): Promise<void> {
    await redisClient.del(this.tokenKey(userId, role));
  },

  /** 滑动过期：每次认证通过后重置 TTL，避免活跃用户被踢出 */
  async refreshTokenTTL(userId: number, role: string): Promise<void> {
    await redisClient.expire(this.tokenKey(userId, role), TOKEN_EXPIRES_IN);
  },

  async validateToken(userId: number, role: string, token: string): Promise<boolean> {
    const stored = await this.getToken(userId, role);
    return stored === token;
  },

  // ── 通用缓存 ────────────────────────────────────────────

  async setCache<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async getCache<T>(key: string): Promise<T | null> {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async deleteCache(key: string): Promise<void> {
    await redisClient.del(key);
  },

  /** 批量删除符合 pattern 的缓存，如 problems:level:* */
  async deleteCachePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  },

  // ── 健康检查 ────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const res = await redisClient.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  },
};

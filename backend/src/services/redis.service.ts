/**
 * 文件说明：Redis 封装服务
 * 系统作用：集中管理所有 Redis 操作，分为 token 管理和通用缓存两类
 *          不允许其他模块直接 import redisClient 操作，统一走此 service
 *
 * ── Key 规范（全部通过 CacheKeys 工厂生成，禁止硬编码字符串）──
 *
 *   token:                token:{userId}_{role}            EX=7200s  JWT 鉴权
 *   problem:id:           problem:id:{problemId}           EX=3600s  单题详情（不频繁变化）
 *   problem:pool:         problem:pool:level:{n}:type:{t}  EX=300s   题目池（出题缓冲）
 *   stats:summary:        stats:summary:{studentId}        EX=60s    统计摘要（答题后失效）
 *
 * 调用链：
 *   authService      → redisService.setToken / getToken / deleteToken
 *   authMiddleware   → redisService.getToken / refreshTokenTTL
 *   problemService   → redisService.getCache / setCache (使用 CacheKeys.problemPool/problemById)
 *   statsService     → redisService.getCache / setCache (使用 CacheKeys.statsSummary)
 */
import { redisClient } from "../config/redis";
import { TOKEN_PREFIX, TOKEN_EXPIRES_IN } from "../config/jwt";

// ── 缓存 Key 工厂（所有模块统一从此处取 key，避免拼写错误和散乱） ──────────────

export const CacheKeys = {
  /** JWT token：token:{userId}_{role} */
  token: (userId: number, role: string) => `${TOKEN_PREFIX}${userId}_${role}`,

  /** 单题详情：problem:id:{problemId}（TTL=3600s，题目内容基本不变） */
  problemById: (problemId: number) => `problem:id:${problemId}`,

  /** 题目池：problem:pool:level:{level}:type:{type}（TTL=300s，出题缓冲） */
  problemPool: (level: number, type: string) =>
    `problem:pool:level:${level}:type:${type}`,

  /** 学生统计摘要：stats:summary:{studentId}（TTL=60s，答题后主动失效） */
  statsSummary: (studentId: number) => `stats:summary:${studentId}`,

  /** 错题写入缓冲：mistake:pending:{studentId}:{problemId}:{time} */
  pendingMistake: (studentId: number, problemId: number) =>
    `mistake:pending:${studentId}:${problemId}:${Date.now()}`,
};

// ── TTL 常量（集中管理，方便调整） ────────────────────────────────────────────

export const CacheTTL = {
  TOKEN: TOKEN_EXPIRES_IN, // 7200s  JWT 有效期
  PROBLEM_POOL: 300, // 300s   题目池缓冲（5 分钟）
  PROBLEM_DETAIL: 3600, // 3600s  单题详情（1 小时）
  STATS_SUMMARY: 60, // 60s    统计摘要（1 分钟，答题后失效）
  PENDING_MISTAKE: 600, // 600s 错题写入缓冲（削峰保护）
};

export const redisService = {
  // ── Token 管理 ─────────────────────────────────────────

  // 生成 Redis Key，格式为 token:{userId}_{role}
  tokenKey(userId: number, role: string): string {
    return `${TOKEN_PREFIX}${userId}_${role}`;
  },

  // 存储 token，设置过期时间（EX=TOKEN_EXPIRES_IN）
  async setToken(userId: number, role: string, token: string): Promise<void> {
    await redisClient.set(
      this.tokenKey(userId, role),
      token,
      "EX",
      TOKEN_EXPIRES_IN,
    );
  },

  // 获取 token
  async getToken(userId: number, role: string): Promise<string | null> {
    return redisClient.get(this.tokenKey(userId, role));
  },

  // 删除 token（如登出或刷新时）
  async deleteToken(userId: number, role: string): Promise<void> {
    await redisClient.del(this.tokenKey(userId, role));
  },

  // 刷新 token TTL（如用户活跃时延长有效期）
  async refreshTokenTTL(userId: number, role: string): Promise<void> {
    await redisClient.expire(this.tokenKey(userId, role), TOKEN_EXPIRES_IN);
  },

  // 验证 token 是否有效（用于 authMiddleware）
  async validateToken(
    userId: number,
    role: string,
    token: string,
  ): Promise<boolean> {
    const stored = await this.getToken(userId, role);
    return stored === token;
  },

  // ── 通用缓存 ────────────────────────────────────────────

  async setCache<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
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
      return res === "PONG";
    } catch {
      return false;
    }
  },
};

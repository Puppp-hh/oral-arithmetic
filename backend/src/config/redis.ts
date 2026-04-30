/**
 * 文件说明：Redis 客户端配置
 * 系统作用：提供 Redis 单例连接，用于 token 存储与题目缓存
 * 调用链：service → redisClient.set/get → Redis
 */
import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger";

dotenv.config();

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
});

redisClient.on("connect", () => {
  logger.info(`[Redis] 连接成功，host: ${process.env.REDIS_HOST}`);
});

redisClient.on("error", (err: Error) => {
  logger.error(`[Redis] 连接错误: ${err.message}`);
});

export default redisClient;

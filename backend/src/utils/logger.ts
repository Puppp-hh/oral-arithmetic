/**
 * 文件说明：pino 日志工具封装
 * 系统作用：提供全局统一的日志实例，区分开发（彩色美化输出）和生产（JSON 结构化输出）环境
 * 调用链：任意模块 import logger → logger.info/warn/error/debug
 *
 * 日志级别规则：
 *   debug  → 开发调试信息（生产不输出）
 *   info   → 正常业务流程（服务启动、请求完成）
 *   warn   → 非致命警告（4xx 响应、业务降级）
 *   error  → 错误/异常（5xx、未捕获异常）
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const DB_NAME = process.env.DB_NAME || "oral_arithmetic";

const logger = pino(
  {
    // 开发环境使用 debug 级别，生产环境使用 info 级别，避免过多日志干扰
    level: isDev ? "debug" : "info",
    // 生产环境下附加基础字段，便于日志聚合平台过滤
    base: isDev ? undefined : { env: process.env.NODE_ENV, service: DB_NAME },
    // 时间戳格式：ISO 字符串
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
          messageFormat: "{msg}",
          errorLikeObjectKeys: ["err", "error"],
        },
      })
    : undefined, // 生产环境直接输出 JSON 到 stdout，由 PM2 / K8s 等收集
);

export default logger;

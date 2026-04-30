/**
 * 文件说明：HTTP 请求/响应日志中间件（基于 pino-http）
 * 系统作用：
 *   - 每个请求结束后自动记录 method + url + statusCode + responseTime
 *   - 根据状态码自动选择日志级别（info / warn / error）
 *   - 将 logger 实例挂载到 req.log，controller/service 可直接使用
 * 调用链：
 *   Express 请求进入 → requestLoggerMiddleware → 业务路由处理 → 响应发出时记录日志
 *
 * 日志级别策略：
 *   5xx / 抛出错误  → error
 *   4xx             → warn
 *   其余            → info
 *
 * 开发环境日志示例（pino-pretty 美化）：
 *   [12:00:01] INFO: POST /api/auth/student/login → 200 (45ms)
 * 生产环境日志示例（JSON）：
 *   {"level":30,"time":"...","method":"POST","url":"/api/auth/student/login","status":200,"responseTime":45}
 */
import pinoHttp from "pino-http";
import logger from "../utils/logger";

export const requestLoggerMiddleware = pinoHttp({
  // 复用全局 logger 实例，保证日志格式/输出目标一致
  logger,

  // 根据响应状态码动态选择日志级别
  customLogLevel(_req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  // 自定义请求日志消息
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} → ${res.statusCode}`;
  },

  // 自定义错误日志消息
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`;
  },

  // 精简请求序列化字段（避免记录敏感 headers）
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },

  // 跳过健康检查接口日志，避免噪音
  autoLogging: {
    ignore(req) {
      return req.url === "/health";
    },
  },
});

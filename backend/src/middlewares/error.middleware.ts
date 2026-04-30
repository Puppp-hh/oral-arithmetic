/**
 * 文件说明：全局错误处理中间件
 * 系统作用：捕获所有未处理异常，用 pino 记录结构化错误日志，返回统一 500 格式
 * 调用链：Express 错误链 → errorMiddleware → logger.error(完整堆栈) → 返回 {code:500, message, data:null}
 */
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 结构化错误日志：包含请求上下文 + 完整堆栈，便于排查
  logger.error(
    {
      err: { message: err.message, stack: err.stack, name: err.name },
      req: { method: req.method, url: req.url, ip: req.ip },
    },
    `[GlobalError] ${req.method} ${req.url} → ${err.message}`,
  );

  res.status(500).json({
    code: 500,
    message: err.message || "服务器内部错误",
    data: null,
  });
}

/**
 * 文件说明：全局错误处理中间件
 * 系统作用：捕获所有未处理异常，返回统一 500 格式，防止服务崩溃
 * 调用链：Express 错误链 → errorMiddleware → 返回 {code:500, message, data:null}
 */
import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message, err.stack);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
    data: null,
  });
}

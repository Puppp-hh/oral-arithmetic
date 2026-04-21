/**
 * 文件说明：统一 API 响应格式工具
 * 系统作用：所有 controller 调用此方法返回标准 {code, message, data} 结构
 * 调用链：controller → success/fail → res.json({code, message, data})
 */
import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function success<T>(res: Response, data: T, message = 'ok', code = 200): void {
  res.status(200).json({ code, message, data } as ApiResponse<T>);
}

export function fail(res: Response, message: string, code = 400, httpStatus = 400): void {
  res.status(httpStatus).json({ code, message, data: null } as ApiResponse<null>);
}

export function serverError(res: Response, message = '服务器内部错误'): void {
  res.status(500).json({ code: 500, message, data: null } as ApiResponse<null>);
}

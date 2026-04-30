/**
 * 文件说明：通用 Zod 参数校验中间件工厂
 * 系统作用：
 *   将 Zod schema 包装为 Express 中间件，插入路由链
 *   校验通过后将 parsed（类型安全 + 默认值填充）结果写回 req[source]
 *   校验失败返回统一错误格式，终止请求链
 *
 * 调用链：
 *   router.post('/login', validate(loginSchema), controller)
 *   → validate 中间件解析 req.body
 *     ├─ 成功 → 将 Zod 解析结果（含默认值/coerce）赋回 req.body → next()
 *     └─ 失败 → res.status(400).json({ code:400, message:'参数校验失败', data:{ errors } })
 *
 * 统一错误格式（校验失败时）：
 *   {
 *     "code": 400,
 *     "message": "参数校验失败",
 *     "data": {
 *       "errors": [
 *         { "field": "account", "message": "账号不能为空" },
 *         { "field": "password", "message": "密码至少 6 位" }
 *       ]
 *     }
 *   }
 */
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

/**
 * 校验中间件工厂
 * @param schema  Zod schema
 * @param source  校验来源，默认 'body'
 */
export function validate(schema: ZodTypeAny, source: RequestSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // zod v4: .issues 替代旧版 .errors
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.') || 'root',
        message: e.message,
      }));
      res.status(400).json({
        code: 400,
        message: '参数校验失败',
        data: { errors },
      });
      return;
    }

    // 将 Zod 解析后的值（含类型强转、默认值）写回请求对象
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[source] = result.data;
    next();
  };
}

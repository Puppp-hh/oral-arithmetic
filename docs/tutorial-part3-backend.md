# 小学数学口算分级训练系统 — 后端开发文档

> 本文档衔接《开发环境准备》，从零实现完整后端服务。每节包含原理解释、完整代码、验证方法。

---

# 三、核心配置层

配置层的职责是**创建全局单例连接对象**，供所有 service 共享使用。

理解"单例"的重要性：数据库连接是昂贵的资源（需要 TCP 握手、认证、协议协商）。如果每次 SQL 查询都新建一个连接，在高并发下会耗尽数据库允许的最大连接数。连接池的做法是预先建立若干连接，请求到来时借用，用完归还，复用连接而非反复创建。

---

## 3.1 MySQL 连接池配置

### 原理：连接池工作机制

```
应用启动时：
  Pool 初始化 → 建立 connectionLimit 条 TCP 连接
                ↓
请求进入：
  pool.execute(sql) → 从空闲连接列表取一条连接
                    → 执行 SQL → 返回结果
                    → 将连接归还到空闲列表
                ↓
若所有连接都在使用：
  新请求进入等待队列（waitForConnections: true）
  → 有连接归还时立即分配
```

`mysql2` 与旧版 `mysql` 包的核心区别：
- `mysql2` 原生支持 Promise，无需 `util.promisify` 包装，直接使用 `async/await`。
- `mysql2` 支持 prepared statements 二进制协议，性能更高。
- `pool.execute()` 与 `pool.query()` 的区别：`execute()` 使用 prepared statement（参数化查询），可防止 SQL 注入，`query()` 直接拼接字符串。**本项目统一使用 `execute()`。**

### 完整代码

创建 `src/config/database.ts`：

```typescript
/**
 * 文件说明：MySQL 连接池配置
 * 系统作用：统一管理数据库连接，所有 service 通过此连接池执行 SQL
 * 调用链：service → pool.execute(sql, params) → MySQL → 返回 RowDataPacket[]
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'oral_arithmetic',

  // 最大连接数。调大可处理更多并发，但 MySQL 服务器也有上限（默认 151）
  connectionLimit: 10,

  // 等待连接可用（true = 排队等；false = 超出上限直接报错）
  waitForConnections: true,

  // 等待队列最大长度（0 = 不限）
  queueLimit: 0,

  // 确保中文字段存储正确（真正的 UTF-8，支持 emoji）
  charset: 'utf8mb4',

  // 服务器时区（避免 MySQL datetime 和 Node.js Date 对象时差问题）
  timezone: '+08:00',
});

/**
 * 验证数据库连接（在 bootstrap 函数中调用）
 * 获取一条连接并立即释放，用于启动时快速确认可达性
 */
export async function testDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  console.log('[DB] MySQL 连接成功，host:', process.env.DB_HOST);
  conn.release();
}
```

### 在 service 中使用 pool 的标准写法

```typescript
import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// SELECT 查询：返回 RowDataPacket[]
const [rows] = await pool.execute<RowDataPacket[]>(
  'SELECT * FROM student WHERE account = ? LIMIT 1',
  [account]   // 参数化，? 占位符，防止 SQL 注入
);
// rows 是数组，每个元素是一行记录（key = 列名，value = 列值）

// INSERT/UPDATE/DELETE：返回 ResultSetHeader
const [result] = await pool.execute<ResultSetHeader>(
  'INSERT INTO student (account, name) VALUES (?, ?)',
  [account, name]
);
// result.insertId 是自增主键值
// result.affectedRows 是影响的行数
```

**为什么用解构 `[rows]`：** `pool.execute()` 返回 `[results, fields]`，`results` 是数据，`fields` 是列元数据（列名、类型等）。大多数情况下只需要数据，解构只取第一个元素。

### 验证方法

在 `src/app.ts` 的 `bootstrap` 函数中添加：

```typescript
import { testDbConnection } from './config/database';

async function bootstrap() {
  await testDbConnection();  // 若连接失败，此处抛异常，进程退出
  // ...启动服务
}
```

启动后看到 `[DB] MySQL 连接成功` 即表示连接池正常。

若看到 `ECONNREFUSED`，说明 MySQL 服务未启动：

```bash
brew services start mysql@8.0
```

---

## 3.2 Redis 客户端配置

### 原理：ioredis 连接管理

`ioredis` 是 Redis 的 Node.js 客户端，支持：
- Promise/async-await API
- 自动重连（连接断开后按策略重试）
- 连接池（cluster 模式）
- 管道（pipeline）和事务（multi/exec）

本项目使用单节点 Redis，`new Redis(options)` 创建一个持久的 TCP 连接，所有命令复用这一条连接（Redis 是单线程处理命令，不需要连接池）。

**`retryStrategy` 的作用：** 网络抖动或 Redis 重启后，ioredis 会自动尝试重连。`retryStrategy` 控制重试间隔，返回 `null` 表示放弃重试（超过 3 次后停止）。

### 完整代码

创建 `src/config/redis.ts`：

```typescript
/**
 * 文件说明：Redis 客户端配置
 * 系统作用：提供 Redis 单例连接，用于 token 存储（鉴权）和数据缓存
 * 调用链：redis.service → redisClient.set/get/del → Redis
 */
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = new Redis({
  host:     process.env.REDIS_HOST     || '127.0.0.1',
  port:     Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db:       Number(process.env.REDIS_DB)   || 0,

  /**
   * 重连策略：
   *   times = 已重试次数
   *   返回毫秒数 = 下次重试等待时间
   *   返回 null  = 停止重试（放弃连接）
   */
  retryStrategy: (times: number) => {
    if (times > 3) return null;          // 超过 3 次放弃
    return Math.min(times * 200, 1000);  // 200ms → 400ms → 600ms → 最多 1000ms
  },
});

// 连接事件：成功建立 TCP 连接时触发
redisClient.on('connect', () => {
  console.log('[Redis] 连接成功，host:', process.env.REDIS_HOST);
});

// 错误事件：连接失败或命令执行出错时触发
// 必须监听此事件，否则 Node.js 会因未捕获的 error 事件崩溃
redisClient.on('error', (err: Error) => {
  console.error('[Redis] 连接错误:', err.message);
});

export default redisClient;
```

### 验证方法

在 `bootstrap` 中加入：

```typescript
import { redisClient } from './config/redis';

async function bootstrap() {
  await testDbConnection();
  const pong = await redisClient.ping();
  if (pong !== 'PONG') throw new Error('Redis 连接异常');
  console.log('[Redis] PING →', pong);
  // ...
}
```

---

## 3.3 JWT 配置常量

### 完整代码

创建 `src/config/jwt.ts`：

```typescript
/**
 * 文件说明：JWT 配置常量
 * 系统作用：集中管理 JWT 密钥和过期时间，避免散落在各文件中的硬编码
 * 调用链：auth.service → signToken(payload, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN})
 */
import dotenv from 'dotenv';
dotenv.config();

// JWT 签名密钥：生产环境必须换成高熵随机字符串（至少 32 字节）
export const JWT_SECRET: string =
  process.env.JWT_SECRET || 'oral_arithmetic_jwt_secret_2024';

// JWT 自身过期时间（秒）：编码进 payload 的 exp 字段
export const JWT_EXPIRES_IN: number =
  Number(process.env.JWT_EXPIRES_IN) || 7200;

// Redis 中 token key 的 TTL（秒）：与 JWT_EXPIRES_IN 保持一致
export const TOKEN_EXPIRES_IN: number =
  Number(process.env.TOKEN_EXPIRES_IN) || 7200;

// Redis key 前缀：所有 token key 格式为 token:{userId}_{role}
export const TOKEN_PREFIX = 'token:';
```

---

# 四、日志系统（pino）

## 4.1 为什么必须有专业日志系统

### console.log 的本质问题

很多初学者在 Node.js 中用 `console.log` 调试，但这在生产环境有致命缺陷：

**问题一：同步写入阻塞事件循环**

`console.log` 底层调用 `process.stdout.write()`，在写入完成前当前任务不会继续。Node.js 是单线程的，如果写日志的速度跟不上请求速度，每条日志都会让请求处理延迟。

来看一个具体数字：

```
每秒 1000 个请求，每个请求写 3 条 console.log
= 每秒 3000 次同步写文件
= 每次约 0.1ms 写入延迟
= 总日志写入阻塞时间：3000 × 0.1ms = 300ms/秒
```

这意味着每秒有 300ms 时间在写日志，而不是处理业务。

**问题二：纯文本无法被机器解析**

```
# console.log 输出（人能看懂，机器不能查询）
POST /api/auth/student/login 200 45ms student001 logged in

# pino 输出（机器可解析的 JSON）
{"level":30,"time":"2024-01-01T12:00:01.000Z","method":"POST","url":"/api/auth/student/login","statusCode":200,"responseTime":45,"msg":"request completed"}
```

当线上出现问题，需要查询"过去1小时内，响应时间超过500ms的接口有哪些"，JSON 日志可以直接用 `jq`、Elasticsearch、Grafana Loki 查询，纯文本做不到。

**问题三：没有级别控制**

生产环境不应该打印调试信息（噪音太多），开发环境又需要详细日志。`console.log` 没有级别概念，只能全量输出或手动注释掉。

**问题四：没有请求上下文关联**

多个并发请求交叉执行，`console.log` 输出的日志不知道哪条属于哪个请求，无法追踪一次请求的完整生命周期。

---

## 4.2 日志分级

pino 遵循 RFC 5424 日志严重性级别标准，从低到高：

| 级别 | 数值 | 使用场景 | 示例 |
|------|------|----------|------|
| `trace` | 10 | 极详细的调试（通常不开） | SQL 参数、内部变量 |
| `debug` | 20 | 开发调试（生产不输出） | 缓存是否命中、函数调用路径 |
| `info` | 30 | 正常业务事件 | 服务启动、用户登录、请求完成 |
| `warn` | 40 | 非致命警告 | 参数校验失败、降级到备用逻辑 |
| `error` | 50 | 错误、异常 | DB 查询失败、未捕获异常 |
| `fatal` | 60 | 系统级灾难性错误 | 进程即将退出 |

**级别过滤规则：** 设置日志 `level` 为某级别时，只输出该级别及以上的日志。

```
level = 'info'  →  输出 info + warn + error + fatal（不输出 trace/debug）
level = 'debug' →  输出 debug + info + warn + error + fatal（不输出 trace）
```

**本项目策略：**
- 开发环境（`NODE_ENV=development`）：`level = 'debug'`，全量输出，方便调试。
- 生产环境（`NODE_ENV=production`）：`level = 'info'`，过滤掉调试噪音。

---

## 4.3 pino 核心原理：为什么它快

**架构设计：异步序列化 + 子进程写入**

```
主线程（处理业务）：
  logger.info({userId, level}, '登录成功')
  ↓
  序列化对象为 JSON 字符串（极快，pino 用的是 fast-json-stringify 而不是 JSON.stringify）
  ↓
  将字符串写入管道（pipe），立即返回，不等待磁盘写入
  ↓
  继续处理下一个业务逻辑

子进程（专门负责写文件/格式化）：
  从管道读取 JSON 字符串
  ↓
  写入文件系统 / 格式化为彩色输出（pino-pretty）
  ↓
  不占用主线程时间
```

这种架构让日志序列化和写入对业务代码几乎零影响。

**fast-json-stringify 的优势：** 标准 `JSON.stringify` 需要遍历对象、推断类型。`fast-json-stringify` 要求提前提供 JSON Schema，在序列化时直接按 Schema 拼接字符串，速度是 `JSON.stringify` 的 2-10 倍。

---

## 4.4 logger.ts — 日志工具封装

### 完整代码

创建 `src/utils/logger.ts`：

```typescript
/**
 * 文件说明：pino 日志工具封装
 * 系统作用：
 *   - 提供全局唯一的 logger 实例（单例）
 *   - 开发环境：pino-pretty 彩色格式化输出，人类可读
 *   - 生产环境：原始 JSON 输出，供日志聚合平台消费
 *
 * 使用方式：
 *   import logger from '../utils/logger';
 *   logger.info('服务启动');
 *   logger.info({ userId: 1, level: 3 }, '学生升级');
 *   logger.error({ err, req: { url, method } }, '接口异常');
 *
 * 调用链：
 *   任意模块 → logger.info/warn/error/debug(data, message)
 *            → pino 序列化为 JSON
 *            → 开发环境: pino-pretty 格式化 → 终端
 *            → 生产环境: JSON → stdout → 日志收集器
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  {
    // 日志级别：开发 debug（全量），生产 info（过滤调试信息）
    level: isDev ? 'debug' : 'info',

    // 时间戳：ISO 8601 格式字符串（"2024-01-01T12:00:01.000Z"）
    // 比默认的毫秒时间戳对人类更友好，对日志平台也标准
    timestamp: pino.stdTimeFunctions.isoTime,

    // 生产环境附加基础字段（出现在每条日志中）
    // 用于在日志聚合平台中过滤特定服务的日志
    base: isDev
      ? undefined
      : { env: process.env.NODE_ENV, service: 'oral-arithmetic' },
  },

  // 第二参数是目标流（destination）：
  // 开发环境使用 pino-pretty（彩色美化），生产环境输出到 stdout（默认）
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          // colorize: true 启用 ANSI 颜色（终端显示彩色）
          colorize: true,
          // 将 ISO 时间戳格式化为本地时间
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          // 忽略 pid 和 hostname（开发环境无意义）
          ignore: 'pid,hostname',
          // 错误对象展开显示（而非 [Object]）
          errorLikeObjectKeys: ['err', 'error'],
        },
      })
    : undefined, // undefined = 输出到 process.stdout（标准输出）
);

export default logger;
```

### 开发环境输出示例

```
[12:00:01] INFO: [Server] 启动成功 → http://localhost:3000
[12:00:02] INFO: POST /api/auth/student/login → 200
    userId: 1
    responseTime: 45
[12:00:03] WARN: GET /api/problems/generate → 401
    message: 未提供认证 token
[12:00:04] ERROR: POST /api/problems/submit → 500
    err: {
      message: "ER_NO_SUCH_TABLE: Table 'oral_arithmetic.problem' doesn't exist"
      stack: "Error: ER_NO_SUCH_TABLE..."
    }
```

### 生产环境输出示例（JSON）

```json
{"level":30,"time":"2024-01-01T12:00:01.000Z","env":"production","service":"oral-arithmetic","msg":"[Server] 启动成功 → http://localhost:3000"}
{"level":30,"time":"2024-01-01T12:00:02.000Z","env":"production","service":"oral-arithmetic","method":"POST","url":"/api/auth/student/login","statusCode":200,"responseTime":45,"msg":"request completed"}
```

---

## 4.5 请求日志中间件（pino-http）

### 原理：中间件在请求生命周期中的位置

```
HTTP 请求进入 Express
    ↓
requestLoggerMiddleware（pino-http）
    记录：method, url, IP
    ↓
authMiddleware（JWT 验证）
    ↓
validate（参数校验）
    ↓
controller（业务处理）
    ↓
service → DB/Redis
    ↓
response.json() 发出响应
    ↓
requestLoggerMiddleware（在 res.end 钩子中）
    记录：statusCode, responseTime
    根据 statusCode 选择日志级别：
      2xx → info
      4xx → warn
      5xx → error
```

`pino-http` 通过 monkey-patching `res.end` 方法，在响应发出的瞬间记录完整的请求信息（包括响应时间）。这是它能拿到 `responseTime` 的原因。

### 完整代码

创建 `src/middlewares/request-logger.middleware.ts`：

```typescript
/**
 * 文件说明：HTTP 请求/响应日志中间件（基于 pino-http）
 * 系统作用：
 *   - 每个请求结束时自动记录 method + url + statusCode + responseTime
 *   - 根据状态码自动选择日志级别（info/warn/error）
 *   - 将 logger 实例挂载到 req.log，controller 可通过 req.log 记录请求上下文日志
 *
 * 调用链：
 *   请求进入 → requestLoggerMiddleware → 业务处理 → 响应发出 → pino-http 记录日志
 *
 * 跳过条件：/health 接口不记录（避免监控探针产生噪音）
 */
import pinoHttp from 'pino-http';
import logger from '../utils/logger';

export const requestLoggerMiddleware = pinoHttp({
  // 复用全局 logger，保证日志格式、输出目标与其他日志一致
  logger,

  /**
   * 根据响应状态码和是否有错误动态选择日志级别：
   *   5xx 或未捕获异常 → error（需要立即关注）
   *   4xx             → warn（客户端错误，非服务器问题）
   *   其他            → info（正常流程）
   */
  customLogLevel(_req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // 自定义成功日志消息格式（简洁，关键信息在字段中）
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} → ${res.statusCode}`;
  },

  // 自定义错误日志消息格式（附带错误原因）
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`;
  },

  // 精简请求序列化（只保留关键字段，过滤敏感 headers）
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },

  // 自动日志开关 + 跳过规则
  autoLogging: {
    // /health 是监控探针，每隔几秒调用一次，不需要记录到日志
    ignore(req) {
      return req.url === '/health';
    },
  },
});
```

### 在 controller 中使用 req.log

`pino-http` 会将绑定了请求上下文的 logger 挂载到 `req.log`。用 `req.log` 而非全局 `logger` 的好处是：日志条目中会自动包含这个请求的 `reqId`（请求唯一 ID），可以追踪同一请求产生的所有日志。

```typescript
// 在任何 controller 或中间件中
export async function generateProblems(req: AuthRequest, res: Response) {
  // 使用 req.log 而不是全局 logger
  req.log.debug({ userId: req.user?.userId, level }, '开始出题');

  try {
    const problems = await problemService.generateProblems(dto);
    req.log.info({ count: problems.length }, '出题成功');
    success(res, { count: problems.length, problems });
  } catch (e) {
    req.log.error({ err: e }, '出题失败');
    fail(res, (e as Error).message);
  }
}
```

---

## 4.6 全局错误捕获中间件（集成日志）

### 原理：Express 四参数中间件

Express 通过函数签名区分普通中间件和错误中间件：

```typescript
// 普通中间件：3 个参数
app.use((req, res, next) => { ... });

// 错误中间件：4 个参数（第一个参数是 error）
app.use((err, req, res, next) => { ... });
```

当任何 `next(error)` 被调用，或 `async` 函数抛出未被捕获的异常时，Express 跳过所有普通中间件，直接调用错误中间件。

**必须放在所有路由之后：** 错误中间件是"兜底"的，必须在 `app.use()` 挂载路由之后注册，否则路由抛出的错误不会流向它。

### 完整代码

创建 `src/middlewares/error.middleware.ts`：

```typescript
/**
 * 文件说明：全局错误处理中间件
 * 系统作用：
 *   - 捕获所有未被 controller catch 的异常
 *   - 用 pino 记录结构化错误日志（含请求上下文 + 完整 stack trace）
 *   - 返回统一 500 响应格式，不泄漏内部实现细节
 *
 * 调用链：
 *   controller 抛出异常
 *   → Express 路由链 next(err)
 *   → errorMiddleware
 *   → logger.error(结构化数据)
 *   → res.status(500).json(统一格式)
 *
 * 注意：必须在 app.ts 中所有路由注册之后挂载此中间件
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction  // 必须声明第四参数，否则 Express 不识别为错误中间件
): void {
  /**
   * 结构化错误日志：
   *   err.message + err.stack：完整错误信息，定位问题的关键
   *   req.method + req.url：是哪个接口出了问题
   *   req.ip：哪个客户端触发的
   *   req.user（如果有）：哪个用户触发的
   *
   * 生产环境这条日志会被日志聚合平台捕获，触发告警
   */
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      req: {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
    },
    `[GlobalError] ${req.method} ${req.url} → ${err.message}`,
  );

  // 不将错误详情（尤其是 stack trace）暴露给客户端
  // 客户端只需要知道"服务器出错了"，内部细节是安全风险
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
    data: null,
  });
}
```

### 验证：一次完整的错误日志演示

假设 `problemService.submitAnswer` 抛出一个未被捕获的异常：

```
请求：POST /api/problems/submit { problem_id: 99999 }
  ↓
authMiddleware：验证通过
  ↓
submitAnswer controller：调用 problemService.submitAnswer(studentId, dto)
  ↓
problemService：SELECT * FROM problem WHERE problem_id = 99999 → 返回空数组
  ↓
throw new Error('题目不存在或已下架')
  ↓（被 controller 的 try/catch 捕获，调用 fail(res, message)，正常返回 400）

若 controller 中没有 try/catch：
  ↓
Express 的 next(err) 机制
  ↓
errorMiddleware：logger.error({ err: { message, stack }, req: { method, url } })
  ↓
日志输出：
{
  "level": 50,
  "time": "2024-01-01T12:00:01.000Z",
  "err": {
    "message": "题目不存在或已下架",
    "stack": "Error: 题目不存在或已下架\n    at Object.submitAnswer (/app/src/services/problem.service.ts:113:29)",
    "name": "Error"
  },
  "req": { "method": "POST", "url": "/api/problems/submit", "ip": "::1" },
  "msg": "[GlobalError] POST /api/problems/submit → 题目不存在或已下架"
}
```

通过这条日志，可以立即知道：是哪个接口、哪行代码、什么错误，无需复现即可定位。

---

## 4.7 在 app.ts 中集成日志系统

更新 `src/app.ts`，将日志中间件挂载到正确位置：

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { testDbConnection } from './config/database';
import { redisClient } from './config/redis';
import { errorMiddleware } from './middlewares/error.middleware';
// ✅ 导入日志中间件
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';
import { swaggerSpec } from './docs/swagger';
import logger from './utils/logger';

import authRoutes from './routes/auth.routes';
import problemRoutes from './routes/problem.routes';
import mistakeRoutes from './routes/mistake.routes';
import statsRoutes from './routes/stats.routes';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

// ── 全局中间件（顺序非常重要）────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ 请求日志：放在业务中间件之前，确保所有请求都被记录
// 注意：放在 cors/json 之后，因为这些中间件的处理时间不计入响应时间
app.use(requestLoggerMiddleware);

// ── Swagger 文档（开发环境）─────────────────────────────────
if (process.env.DISABLE_SWAGGER !== 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '口算训练系统 API 文档',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// ── 路由挂载 ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/mistakes', mistakeRoutes);
app.use('/api/stats', statsRoutes);

// ── 健康检查 ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ code: 200, message: 'ok', data: { status: 'running', time: new Date() } });
});

// ── 404 处理 ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// ✅ 全局错误中间件：必须在所有路由之后、最后注册
app.use(errorMiddleware);

// ── 服务启动 ────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await testDbConnection();
    await redisClient.ping();
    app.listen(PORT, () => {
      // ✅ 使用 logger 而不是 console.log
      logger.info(`[Server] 启动成功 → http://localhost:${PORT}`);
      logger.info(`[Server] 运行环境: ${process.env.NODE_ENV}`);
      if (process.env.DISABLE_SWAGGER !== 'true') {
        logger.info(`[Swagger] 接口文档 → http://localhost:${PORT}/api-docs`);
      }
    });
  } catch (err) {
    logger.error({ err }, '[Server] 启动失败');
    process.exit(1);  // 非零退出码，告诉 Docker/PM2 进程异常退出
  }
}

bootstrap();
export default app;
```

---

# 五、工程化设计

工程化设计回答的问题是：**为什么这样组织代码，而不是把所有逻辑写在一起？**

## 5.1 统一响应格式

### 为什么要统一响应格式

微信小程序端需要判断接口调用是否成功，如果每个接口的响应结构不同，前端需要为每个接口写不同的解析逻辑，维护成本极高。

统一格式：所有接口返回相同的顶层结构，前端只需在一个地方处理成功/失败判断。

```typescript
// 前端（微信小程序）统一处理：
wx.request({
  url: API_URL,
  success(res) {
    const { code, message, data } = res.data;
    if (code === 200) {
      // 处理 data
    } else {
      wx.showToast({ title: message, icon: 'none' });
    }
  }
})
```

### 完整代码

创建 `src/utils/response.ts`：

```typescript
/**
 * 文件说明：统一 API 响应格式工具
 * 系统作用：所有 controller 调用此工具返回标准 {code, message, data} 结构
 *
 * 统一格式的价值：
 *   - 前端只需在一处处理成功/失败
 *   - 接口文档格式一致，降低理解成本
 *   - 日志分析时可用 code 字段过滤
 *
 * 调用链：controller → success/fail(res, ...) → res.json({code, message, data})
 */
import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 成功响应：HTTP 200 + 业务成功码
 * @param res     Express Response 对象
 * @param data    响应数据（任意类型）
 * @param message 提示信息（默认 'ok'）
 * @param code    业务码（默认 200）
 */
export function success<T>(
  res: Response,
  data: T,
  message = 'ok',
  code = 200,
): void {
  res.status(200).json({ code, message, data } as ApiResponse<T>);
}

/**
 * 失败响应：返回客户端错误
 * @param res        Express Response 对象
 * @param message    错误信息（直接展示给用户）
 * @param code       业务错误码（默认 400）
 * @param httpStatus HTTP 状态码（默认 400）
 */
export function fail(
  res: Response,
  message: string,
  code = 400,
  httpStatus = 400,
): void {
  res.status(httpStatus).json({ code, message, data: null } as ApiResponse<null>);
}

/**
 * 服务器错误响应（通常由 errorMiddleware 调用）
 */
export function serverError(res: Response, message = '服务器内部错误'): void {
  res.status(500).json({ code: 500, message, data: null } as ApiResponse<null>);
}
```

---

## 5.2 参数校验（Zod）

### 为什么必须在服务端做参数校验

微信小程序端虽然有输入限制，但用户可以通过抓包工具直接发送 HTTP 请求，绕过前端验证。服务端不校验参数会导致：
- SQL 注入（若用字符串拼接 SQL）
- 非法数据写入数据库（负数难度等级、超长字符串）
- 业务逻辑错误（空 problem_id 导致查询全表）

### 通用校验中间件工厂

创建 `src/middlewares/validate.middleware.ts`：

```typescript
/**
 * 文件说明：通用 Zod 参数校验中间件工厂
 * 系统作用：
 *   1. 接收 Zod schema，返回一个 Express 中间件
 *   2. 中间件执行时解析 req[source]（body/query/params）
 *   3. 校验失败：立即返回 400，终止请求链，不进入 controller
 *   4. 校验通过：将解析后的值（含默认值、类型转换）写回 req[source]
 *
 * 调用链：
 *   router.post('/submit', authMiddleware, validate(submitSchema), controller)
 *   → validate 中间件
 *     ├─ 失败 → 400 { code:400, message:'参数校验失败', data:{ errors:[...] } }
 *     └─ 通过 → req.body = 解析后的值 → next() → controller
 *
 * 统一校验失败格式：
 *   { "code": 400, "message": "参数校验失败", "data": { "errors": [
 *     { "field": "account", "message": "账号不能为空" }
 *   ]}}
 */
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: RequestSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // zod v4 使用 .issues（旧版 v3 是 .errors）
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

    // 将 Zod 解析后的值写回 req[source]
    // 重要：解析后的值包含 Zod 的类型转换（z.coerce）和默认值（.default()）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[source] = result.data;
    next();
  };
}
```

### 认证接口 Schema

创建 `src/validators/auth.validator.ts`：

```typescript
/**
 * 文件说明：认证接口 Zod Schema（兼容 zod v4）
 * 系统作用：约束登录/注册接口的入参类型、长度、格式
 * 调用链：auth.routes → validate(schema) → auth.controller
 */
import { z } from 'zod';

export const studentLoginSchema = z.object({
  account:  z.string().min(1, '账号不能为空').max(50, '账号最长 50 位'),
  password: z.string().min(6, '密码至少 6 位').max(100, '密码最长 100 位'),
});

export const teacherLoginSchema = z.object({
  account:  z.string().min(1, '账号不能为空').max(50, '账号最长 50 位'),
  password: z.string().min(6, '密码至少 6 位').max(100, '密码最长 100 位'),
});

export const studentRegisterSchema = z.object({
  account: z
    .string()
    .min(3, '账号至少 3 位')
    .max(50, '账号最长 50 位')
    .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少 6 位').max(100),
  name:     z.string().min(1, '姓名不能为空').max(50),
  class_id: z.number().int('班级 ID 必须为整数').positive('班级 ID 必须为正整数'),
  grade_id: z.number().int('年级 ID 必须为整数').positive('年级 ID 必须为正整数'),
  gender:   z.enum(['male', 'female']).optional(),
  birth_date: z.string().optional(),
});

export type StudentLoginInput    = z.infer<typeof studentLoginSchema>;
export type TeacherLoginInput    = z.infer<typeof teacherLoginSchema>;
export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;
```

### 题目接口 Schema

创建 `src/validators/problem.validator.ts`：

```typescript
/**
 * 文件说明：题目接口 Zod Schema（兼容 zod v4）
 * 注意：generateProblemsSchema 校验 query 参数（字符串），
 *       使用 z.coerce.number() 自动将 "3" 转为 3
 */
import { z } from 'zod';

export const generateProblemsSchema = z.object({
  difficulty_level: z.coerce.number().int().min(1).max(10).optional(),
  count: z.coerce.number().int().min(1).max(20).optional().default(10),
  operation_type: z
    .enum(['addition', 'subtraction', 'multiplication', 'division', 'mixed'])
    .optional(),
});

export const submitAnswerSchema = z.object({
  problem_id:          z.number().int().positive('题目 ID 必须为正整数'),
  answer_content:      z.string().min(1, '答案不能为空').max(200),
  answer_time_seconds: z.number().min(0).max(3600),
  session_id:          z.string().optional(),
  is_review:           z.boolean().optional().default(false),
});

export type GenerateProblemsInput = z.infer<typeof generateProblemsSchema>;
export type SubmitAnswerInput     = z.infer<typeof submitAnswerSchema>;
```

---

# 六、JWT 认证模块

## 6.1 JWT 原理深解

### Token 的三段结构

JWT（JSON Web Token）是一个由三部分组成的字符串，用 `.` 分隔：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  ← Header（Base64URL 编码）
.
eyJ1c2VySWQiOjEsImFjY291bnQiOiJzdHVkZW50MDAxIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwNzIwMH0  ← Payload（Base64URL 编码）
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  ← Signature（HMAC-SHA256）
```

**Header（头部）：** 声明算法类型。
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload（载荷）：** 存储用户身份信息和元数据。
```json
{
  "userId": 1,
  "account": "student001",
  "role": "student",
  "iat": 1700000000,   // issued at：签发时间（Unix 时间戳）
  "exp": 1700007200    // expiration：过期时间（iat + 7200秒）
}
```

**Signature（签名）：** 防篡改的核心机制。
```
HMAC-SHA256(
  Base64URL(Header) + "." + Base64URL(Payload),
  JWT_SECRET         // 只有服务端知道这个密钥
)
```

**验证流程：**

```
客户端发来 token
  ↓
服务端用 JWT_SECRET 对 Header + Payload 重新计算签名
  ↓
比对计算结果与 token 中的 Signature 是否一致
  ↓
一致：token 合法（Payload 未被篡改）
不一致：token 被篡改，拒绝
  ↓
检查 Payload.exp 是否大于当前时间
  ↓
大于：token 未过期
小于：token 已过期，拒绝
```

**重要认知：Payload 不加密，只防篡改。**

任何人都可以 Base64URL 解码 Payload 看到内容。因此：
- 不要在 Payload 中放密码、银行卡号等敏感信息。
- Payload 中放用户 ID 和角色，足够做鉴权，不存放敏感数据。

**JWT 的无状态性：** 服务端不需要存储任何状态就能验证 token（只需要 JWT_SECRET）。这与 Session 的根本区别在于：Session 需要服务端存储，JWT 验证是纯计算。

**本项目为何还需要 Redis 存 token：** 无状态 JWT 的缺点是无法主动吊销。用户点击"退出登录"后，JWT 本身还没过期，如果 token 被截获，攻击者仍可使用。解决方案：登录时将 token 存入 Redis，每次验证同时检查 Redis 中是否存在该 token，登出时从 Redis 删除。这牺牲了"完全无状态"，换来了主动吊销能力。

---

## 6.2 工具函数：JWT 签发与验证

创建 `src/utils/jwt.ts`：

```typescript
/**
 * 文件说明：JWT 签发与验证工具
 * 系统作用：封装 jsonwebtoken 操作，统一错误处理方式
 *
 * signToken：用 JWT_SECRET 签发包含用户身份的 token
 *   输入：{ userId, account, role }
 *   输出：JWT 字符串（有效期 JWT_EXPIRES_IN 秒）
 *
 * verifyToken：验证 token 签名和过期时间
 *   输入：JWT 字符串
 *   输出：解码后的 payload（含 iat, exp）
 *   异常：签名无效 → JsonWebTokenError；过期 → TokenExpiredError
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';
import { JwtPayload } from '../types';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // expiresIn 接受数字（秒）或字符串（'2h', '7d'）
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  // jwt.verify 会同时验证签名和过期时间
  // 签名错误抛 JsonWebTokenError，过期抛 TokenExpiredError
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
```

---

## 6.3 Redis 封装服务（token + 缓存）

创建 `src/services/redis.service.ts`：

```typescript
/**
 * 文件说明：Redis 封装服务
 * 系统作用：集中管理所有 Redis 操作，其他模块不直接操作 redisClient
 *
 * Key 规范（通过 CacheKeys 工厂生成，禁止散落的硬编码字符串）：
 *   token:        token:{userId}_{role}            EX=7200s
 *   problem:pool: problem:pool:level:{n}:type:{t}  EX=300s
 *   problem:id:   problem:id:{problemId}           EX=3600s
 *   stats:summary stats:summary:{studentId}        EX=60s
 */
import { redisClient } from '../config/redis';
import { TOKEN_PREFIX, TOKEN_EXPIRES_IN } from '../config/jwt';

// ── 缓存 Key 工厂 ──────────────────────────────────────────────
export const CacheKeys = {
  token:        (userId: number, role: string) => `${TOKEN_PREFIX}${userId}_${role}`,
  problemById:  (problemId: number)            => `problem:id:${problemId}`,
  problemPool:  (level: number, type: string)  => `problem:pool:level:${level}:type:${type}`,
  statsSummary: (studentId: number)            => `stats:summary:${studentId}`,
};

// ── TTL 常量 ──────────────────────────────────────────────────
export const CacheTTL = {
  TOKEN:          TOKEN_EXPIRES_IN,  // 7200s
  PROBLEM_POOL:   300,               // 5 分钟
  PROBLEM_DETAIL: 3600,              // 1 小时
  STATS_SUMMARY:  60,                // 1 分钟（答题后主动失效）
};

export const redisService = {
  // ── Token 管理 ─────────────────────────────────────────────

  // EX = Expire（秒），Redis 原生过期命令，TTL 到期后 key 自动删除
  async setToken(userId: number, role: string, token: string): Promise<void> {
    await redisClient.set(CacheKeys.token(userId, role), token, 'EX', CacheTTL.TOKEN);
  },

  async getToken(userId: number, role: string): Promise<string | null> {
    return redisClient.get(CacheKeys.token(userId, role));
  },

  async deleteToken(userId: number, role: string): Promise<void> {
    await redisClient.del(CacheKeys.token(userId, role));
  },

  /**
   * 滑动过期：每次有效请求后重置 TTL
   * 效果：活跃用户永不被踢出；长时间不活跃的用户 TTL 自然到期
   */
  async refreshTokenTTL(userId: number, role: string): Promise<void> {
    await redisClient.expire(CacheKeys.token(userId, role), CacheTTL.TOKEN);
  },

  async validateToken(userId: number, role: string, token: string): Promise<boolean> {
    const stored = await this.getToken(userId, role);
    // 严格比对：Redis 中存的 token 必须与传入的完全一致
    return stored === token;
  },

  // ── 通用缓存 ────────────────────────────────────────────────

  async setCache<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async getCache<T>(key: string): Promise<T | null> {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // JSON 解析失败（数据损坏），返回 null 让上层回退到 DB 查询
      return null;
    }
  },

  async deleteCache(key: string): Promise<void> {
    await redisClient.del(key);
  },

  /** 批量删除符合 pattern 的 key（如清空某难度的所有题目缓存） */
  async deleteCachePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  },

  async ping(): Promise<boolean> {
    try {
      return (await redisClient.ping()) === 'PONG';
    } catch {
      return false;
    }
  },
};
```

---

## 6.4 认证 Middleware（JWT 双重验证）

创建 `src/middlewares/auth.middleware.ts`：

```typescript
/**
 * 文件说明：JWT 认证中间件（含滑动过期）
 * 系统作用：
 *   1. 从 Authorization: Bearer <token> Header 中提取 token
 *   2. verifyToken 验证 JWT 签名 + 过期时间（纯计算，不查 DB）
 *   3. 去 Redis 验证 token 存在（防止登出后 token 仍可用）
 *   4. 验证通过后刷新 Redis TTL（滑动过期）
 *   5. 将 payload 注入 req.user，供 controller 使用
 *
 * 调用链：
 *   HTTP 请求 → authMiddleware
 *     ├─ 无 Authorization Header → 401
 *     ├─ JWT 签名/过期验证失败  → 401
 *     ├─ Redis 中不存在该 token → 401（已登出）
 *     └─ 验证通过 → 刷新 TTL → req.user = payload → next()
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { redisService } from '../services/redis.service';
import { fail } from '../utils/response';
import { JwtPayload } from '../types';

// 扩展 Express Request 类型，添加 user 字段
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  // 检查格式：必须是 "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, '未提供认证 token', 401, 401);
    return;
  }

  // slice(7) 跳过 "Bearer " 前缀（7个字符）取得 token 字符串
  const token = authHeader.slice(7);

  try {
    // 第一关：验证 JWT 签名 + 过期时间（同步操作，无 I/O）
    const payload = verifyToken(token);

    // 第二关：验证 Redis 中存在该 token（防止登出后复用）
    const isValid = await redisService.validateToken(payload.userId, payload.role, token);
    if (!isValid) {
      fail(res, 'token 已失效，请重新登录', 401, 401);
      return;
    }

    // 滑动过期：每次成功请求重置 TTL（用户活跃则不被踢出）
    await redisService.refreshTokenTTL(payload.userId, payload.role);

    // 将用户信息挂载到 req.user，后续 controller 直接使用
    req.user = payload;
    next();
  } catch {
    // verifyToken 抛出 JsonWebTokenError 或 TokenExpiredError
    fail(res, 'token 无效或已过期', 401, 401);
  }
}

/** 角色守卫：在 authMiddleware 之后使用，进一步限制角色访问 */
export function requireRole(role: 'student' | 'teacher') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      fail(res, '权限不足', 403, 403);
      return;
    }
    next();
  };
}
```

---

## 6.5 完整登录流程图

```
微信小程序 → POST /api/auth/student/login
              { account: "student001", password: "123456" }
              ↓
validate(studentLoginSchema)
  account: 非空, 最长50位 ✓
  password: 至少6位 ✓
  → req.body = 校验后的值 → next()
              ↓
studentLogin(req, res)
              ↓
authService.studentLogin("student001", "123456")
              ↓
pool.execute('SELECT * FROM student WHERE account = ?', ["student001"])
  → 返回学生记录
              ↓
bcrypt.compare("123456", student.password_hash)
  → 匹配 ✓
              ↓
jwt.sign({ userId: 1, account: "student001", role: "student" }, JWT_SECRET)
  → token = "eyJhbGci..."
              ↓
redisClient.set("token:1_student", token, 'EX', 7200)
  → 存入 Redis，7200秒后自动过期
              ↓
success(res, { token, userInfo, role }, '登录成功')
              ↓
微信小程序收到响应
  → wx.setStorageSync('token', data.token)  // 本地存储 token
  → 后续请求 Header 中携带 Authorization: Bearer <token>
```

---

# 七、题目模块与 Redis 缓存

## 7.1 出题接口的缓存策略

### 问题背景

出题接口（`GET /api/problems/generate`）的调用频率极高：每个学生每次练习调用一次，多个学生同时练习时并发量大。但题目数据变化频率极低（管理员偶尔添加题目）。

如果每次都查 MySQL，在 100 个并发时：
- 100 次 SELECT 同时打到 MySQL
- MySQL 连接池 10 条连接，90 个请求排队等待
- 响应时间从 10ms 上升到 100ms+

**缓存策略：** 将相同参数（难度等级 + 题型）的题目池缓存到 Redis，TTL 300 秒。相同参数的请求直接从 Redis 返回（1ms 内），不触及 MySQL。

```
请求：GET /api/problems/generate?difficulty_level=3&count=5
              ↓
problemService.generateProblems({ difficulty_level: 3, count: 5 })
              ↓
cacheKey = "problem:pool:level:3:type:all"
              ↓
redisService.getCache(cacheKey)
  ├─ 命中（缓存内有 ≥5 道题）→ 随机切片返回（无 DB 查询）
  └─ 未命中
              ↓（缓存未命中时）
pool.execute('SELECT * FROM problem WHERE difficulty_level = 3 LIMIT 50')
  → 最多取 50 道题作为题目池
              ↓
若 DB 题目 < 请求数量：
  dynGenerate(3, needed)  // 动态算法生成题目
  → batchInsertProblems(raw)  // 持久化到 DB
              ↓
redisService.setCache(cacheKey, problems, 300)  // 缓存 300s
              ↓
shuffleAndSlice(problems, count)  // 随机打乱后取前 count 条
              ↓
返回给客户端
```

### 完整代码：问题 service 核心逻辑

`src/services/problem.service.ts` 出题部分：

```typescript
import { pool } from '../config/database';
import { redisService, CacheKeys, CacheTTL } from './redis.service';
import { statsService } from './stats.service';
import {
  generateProblems as dynGenerate,
  normalizeAnswer,
  RawProblem,
} from '../utils/problem-generator';
import { Problem, GenerateProblemDto, SubmitAnswerDto, OperationType } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export const problemService = {

  /**
   * 出题：优先走 Redis 缓存，缓存未命中时查 DB，DB 不足时动态生成
   * 缓存 Key：problem:pool:level:{n}:type:{t}  TTL=300s
   */
  async generateProblems(dto: GenerateProblemDto): Promise<Problem[]> {
    const level = Math.min(10, Math.max(1, dto.difficulty_level ?? 1));
    const count = Math.min(20, Math.max(1, dto.count ?? 10));

    // CacheKeys 工厂确保 key 格式一致，避免散落的字符串拼接
    const cacheKey = CacheKeys.problemPool(level, dto.operation_type ?? 'all');

    // ① 尝试缓存：若题目池够用，直接随机切片返回
    const cached = await redisService.getCache<Problem[]>(cacheKey);
    if (cached && cached.length >= count) {
      return shuffleAndSlice(cached, count);
    }

    // ② 查 DB：取最多 50 条作为题目池（不直接取 count 条，
    //    是为了有足够候选题目做随机，避免每次结果相同）
    let sql = 'SELECT * FROM problem WHERE enable_status = ? AND difficulty_level = ?';
    const params: (string | number)[] = ['enabled', level];
    if (dto.operation_type) {
      sql += ' AND problem_type = ?';
      params.push(dto.operation_type);
    }
    sql += ' LIMIT 50';

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    let problems = rows as Problem[];

    // ③ DB 不足时动态生成补充（多生成10道作为储备）
    if (problems.length < count) {
      const needed = count - problems.length + 10;
      const raw = dynGenerate(level, needed, dto.operation_type as OperationType | undefined);
      const inserted = await batchInsertProblems(raw);
      problems = [...problems, ...inserted];
    }

    // ④ 回写 Redis（TTL=300s）
    await redisService.setCache(cacheKey, problems, CacheTTL.PROBLEM_POOL);

    return shuffleAndSlice(problems, count);
  },

  /**
   * 按 ID 查单题（含解题步骤）
   * 缓存 Key：problem:id:{problemId}  TTL=3600s
   * 题目内容极少变化，可以缓存较长时间
   */
  async getProblemById(problemId: number): Promise<Problem | null> {
    const cacheKey = CacheKeys.problemById(problemId);

    const cached = await redisService.getCache<Problem>(cacheKey);
    if (cached) return cached;

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM problem WHERE problem_id = ? LIMIT 1',
      [problemId],
    );
    if (rows.length === 0) return null;

    const problem = rows[0] as Problem;
    await redisService.setCache(cacheKey, problem, CacheTTL.PROBLEM_DETAIL);
    return problem;
  },
};
```

---

## 7.2 判题逻辑与答案标准化

### 为什么需要答案标准化

学生答 `5`，标准答案是 `5.00`，这在数学上是相同的，但字符串比较会判定为错误。

`normalizeAnswer` 函数处理这类等价情况：

```typescript
/**
 * 位于 src/utils/problem-generator.ts
 * 标准化答案：去除末尾多余的零
 *   "5.00" → "5"
 *   "5.10" → "5.1"
 *   "15"   → "15"（整数不变）
 */
export function normalizeAnswer(raw: string): string {
  const trimmed = raw.trim();
  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;  // 非数字答案（如文字）原样返回
  return String(num);              // parseFloat("5.00") = 5, String(5) = "5"
}
```

### 提交答案接口的完整流程

```typescript
// src/services/problem.service.ts 的 submitAnswer 方法
async submitAnswer(studentId: number, dto: SubmitAnswerDto): Promise<SubmitResult> {
  // ① 取题目
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM problem WHERE problem_id = ? AND enable_status = ? LIMIT 1',
    [dto.problem_id, 'enabled'],
  );
  if (rows.length === 0) throw new Error('题目不存在或已下架');
  const problem = rows[0] as Problem;

  // ② 标准化判题
  const isCorrect =
    normalizeAnswer(dto.answer_content) === normalizeAnswer(problem.standard_answer);
  const score = isCorrect ? 10 : 0;
  const sessionId = dto.session_id ?? uuidv4();

  // ③ 写训练记录（每次答题的完整快照，用于统计分析）
  const [insertResult] = await pool.execute<ResultSetHeader>(
    `INSERT INTO training_record
       (student_id, problem_id, answer_content, is_correct,
        answer_time_seconds, answer_date, score, is_review, session_id)
     VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
    [studentId, dto.problem_id, dto.answer_content, isCorrect,
     dto.answer_time_seconds, score, dto.is_review ?? false, sessionId],
  );

  // ④ 更新题目使用频率（用于计算错误指数）
  await pool.execute(
    'UPDATE problem SET usage_frequency = usage_frequency + 1 WHERE problem_id = ?',
    [dto.problem_id],
  );

  // ⑤ 错题本维护
  if (!isCorrect) {
    // 答错：upsert 错题本（INSERT ... ON DUPLICATE KEY UPDATE 减少一次查询往返）
    await upsertMistake(studentId, problem, dto.answer_content);
  } else {
    // 答对：若在错题本中，自动标记为已改正
    await pool.execute(
      `UPDATE mistake_book
       SET is_corrected = TRUE, corrected_date = NOW()
       WHERE student_id = ? AND problem_id = ? AND is_corrected = FALSE`,
      [studentId, dto.problem_id],
    );
  }

  // ⑥ 等级评估（分析近20题，决定升/降级）
  const { newLevel, rate } = await updateStudentLevel(studentId);

  // ⑦ 更新今日学习统计
  await statsService.upsertDailyStat(studentId);

  // ⑧ 查询答题前的等级（判断本次是否发生等级变化）
  const [prevLvRows] = await pool.execute<RowDataPacket[]>(
    'SELECT current_level FROM student WHERE student_id = ?',
    [studentId],
  );
  const prevLevel = prevLvRows[0]?.current_level ?? 1;

  return {
    is_correct: isCorrect,
    standard_answer: problem.standard_answer,
    score,
    problem_content: problem.problem_content,
    solution_steps: problem.solution_steps,
    record_id: insertResult.insertId,
    level_changed: newLevel !== prevLevel,
    new_level: newLevel,
    recent_20_correct_rate: rate,
  };
},
```

---

# 八、Docker 容器化

## 8.1 Docker 是什么：容器 vs 虚拟机

### 虚拟机的问题

虚拟机（Virtual Machine）通过 Hypervisor 在物理机上模拟完整的硬件，运行独立的操作系统内核。

```
物理机
└── Hypervisor（VMware / VirtualBox）
    ├── VM1：完整 Linux 内核 + 依赖 + 应用（占用 2GB+ 内存）
    ├── VM2：完整 Linux 内核 + 依赖 + 应用（占用 2GB+ 内存）
    └── VM3：...
```

缺点：
- 每个 VM 携带完整操作系统（几GB），体积大，启动慢（分钟级）。
- Hypervisor 层性能开销约 5-15%。

### 容器的方案

容器共享宿主机的操作系统内核，通过 Linux namespace 和 cgroup 实现隔离。

```
物理机（Linux 内核）
└── Docker 守护进程
    ├── Container1：仅包含应用 + 依赖（几十MB），启动秒级
    ├── Container2：仅包含应用 + 依赖
    └── Container3：...
```

容器优势：
- 镜像体积小（本项目 Node.js 镜像约 200MB vs VM 的 2GB+）。
- 启动时间秒级（vs VM 的分钟级）。
- 性能接近裸机（无 Hypervisor 开销）。
- **环境一致性**：镜像打包了应用所需的全部依赖，在任何运行 Docker 的机器上行为完全相同。

---

## 8.2 Dockerfile 逐行解析

本项目使用**多阶段构建**（Multi-stage Build），分两个阶段：
- **builder 阶段**：安装全部依赖（含 devDependencies）+ 编译 TypeScript → 生成 `dist/`
- **production 阶段**：只复制 `dist/` 和生产依赖，丢弃开发工具和源码

好处：最终镜像不包含 TypeScript 编译器、ts-node-dev 等只在开发中用的工具，体积更小，攻击面更小。

`backend/Dockerfile` 完整内容及逐行说明：

```dockerfile
# ── 阶段 1：builder ────────────────────────────────────────────
# FROM 指定基础镜像。node:20-alpine 是 Alpine Linux 版（约 60MB），
# 比 node:20（Debian，约 900MB）小很多，适合生产环境。
FROM node:20-alpine AS builder

# WORKDIR 设置容器内的工作目录。
# 后续所有 COPY/RUN 命令都在 /app 下执行。
# 相当于 mkdir -p /app && cd /app
WORKDIR /app

# 优先复制 package 文件，利用 Docker 层缓存机制：
# Docker 按层构建镜像，每一条指令是一层。
# 如果 package.json 没有变化，这一层直接用缓存，不重新执行 npm ci。
# 只有 package.json 变化时（新增/删除依赖）才重新安装。
# 这让 npm ci 在代码变动但依赖不变时完全跳过（节省几分钟构建时间）。
COPY package*.json ./

# npm ci（clean install）而非 npm install 的原因：
#   - npm ci 严格按 package-lock.json 安装（版本可复现）
#   - npm ci 遇到 lock 文件和 package.json 不一致时报错（发现潜在问题）
#   - npm ci 不修改 lock 文件（适合 CI/CD）
# --frozen-lockfile 相当于 --ci 模式（lock 文件不允许更新）
RUN npm ci --frozen-lockfile

# 复制 TypeScript 配置和源码
COPY tsconfig.json ./
COPY src ./src

# 执行 TypeScript 编译：将 src/*.ts → dist/*.js
# 编译产物在 /app/dist
RUN npm run build

# ── 阶段 2：production ────────────────────────────────────────
# 重新从 node:20-alpine 开始，不继承 builder 阶段的内容
# 这是多阶段构建的核心：最终镜像只包含运行所需的最小集合
FROM node:20-alpine AS production

WORKDIR /app

# 只复制 package 文件，准备安装生产依赖
COPY package*.json ./

# --omit=dev 排除 devDependencies（typescript、ts-node-dev、@types/* 等）
# 最终镜像中没有编译工具，体积减少约 60%
RUN npm ci --frozen-lockfile --omit=dev

# 从 builder 阶段复制编译产物（dist/ 目录）
# --from=builder 指定从哪个阶段复制
# 只复制 dist/，不复制 src/（源码不进入生产镜像）
COPY --from=builder /app/dist ./dist

# EXPOSE 是文档声明，说明容器监听哪个端口
# 实际端口映射由 docker-compose 的 ports 字段控制
EXPOSE 3000

# 安全最佳实践：不以 root 用户运行应用
# node:20-alpine 内置了非 root 的 node 用户（uid=1000）
# 若容器被攻破，攻击者没有 root 权限，危害范围受限
USER node

# 容器启动命令：运行编译后的 app.js
# 使用 JSON 数组格式（exec 格式），而不是字符串格式（shell 格式）
# exec 格式：进程 PID=1，能正确接收 SIGTERM 信号（docker stop 时优雅关闭）
# shell 格式：进程由 /bin/sh -c 启动，PID=1 是 sh，Node.js 收不到信号
CMD ["node", "dist/app.js"]
```

---

## 8.3 docker-compose.yml 逐行解析

`docker-compose.yml` 定义了整个应用栈的拓扑结构。

```yaml
# docker compose v2 格式（无需 version: 字段，Docker 25+ 已弃用）

services:

  # ── MySQL ──────────────────────────────────────────────────
  mysql:
    # 使用官方 MySQL 8.0 镜像（从 Docker Hub 拉取）
    image: mysql:8.0

    # 容器名称（docker ps 中显示的名字）
    container_name: oral_arithmetic_mysql

    # 重启策略：unless-stopped = 除非手动停止，否则崩溃后自动重启
    # （适合生产环境；开发可用 no）
    restart: unless-stopped

    # 传递给容器的环境变量（MySQL 官方镜像识别这些变量做初始化）
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-Root@123456}  # root 密码
      MYSQL_DATABASE: ${DB_NAME:-oral_arithmetic}       # 自动创建的数据库
      MYSQL_USER: ${DB_USER:-root}
      MYSQL_PASSWORD: ${DB_PASSWORD:-Root@123456}
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci

    # ${VAR:-default} 语法：读取 .env 中的变量，不存在时用默认值
    # 这样即使 .env 文件不完整，docker-compose 也能启动

    ports:
      # "宿主机端口:容器端口"
      # 将容器内部的 3306 映射到宿主机的 ${DB_PORT}（默认 3306）
      # 开发时可以用 TablePlus 连接 127.0.0.1:3306
      - "${DB_PORT:-3306}:3306"

    volumes:
      # 具名卷（Named Volume）：持久化数据库文件
      # mysql-data 存储在 Docker 管理的目录（非项目目录）
      # docker compose down 时数据保留，docker compose down -v 时才删除
      - mysql-data:/var/lib/mysql

      # 初始化 SQL：MySQL 官方镜像首次启动（数据卷为空）时
      # 按文件名顺序执行 /docker-entrypoint-initdb.d/ 下的 .sql 文件
      # :ro 表示只读挂载（容器不能修改这些文件）
      - ./sql/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./sql/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro

    # 健康检查：定期执行命令判断服务是否就绪
    # Docker 用健康检查状态决定 depends_on 的 condition 是否满足
    healthcheck:
      # mysqladmin ping：MySQL 客户端连接测试命令
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "root", "-p${DB_PASSWORD:-Root@123456}"]
      interval: 10s    # 每隔 10s 执行一次检查
      timeout: 5s      # 单次检查超过 5s 视为失败
      retries: 10      # 连续 10 次失败才标记为 unhealthy
      start_period: 30s # 容器启动后 30s 内的失败不计入 retries
                         # （给 MySQL 初始化时间，首次启动会执行 SQL 初始化脚本）

    networks:
      - oral_arithmetic_net  # 加入自定义网络

  # ── Redis ──────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: oral_arithmetic_redis
    restart: unless-stopped

    # command 覆盖镜像默认的启动命令
    # 开启 AOF（Append Only File）持久化：
    #   appendonly yes：每条写命令追加到 appendonly.aof 文件
    #   appendfsync everysec：每秒 fsync 一次（性能和持久性的平衡）
    # 效果：Redis 重启后从 AOF 恢复数据，不丢失 token 和缓存
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec

    ports:
      - "${REDIS_PORT:-6379}:6379"

    volumes:
      - redis-data:/data  # Redis 数据目录（AOF 文件存于此）

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

    networks:
      - oral_arithmetic_net

  # ── Node.js 应用 ───────────────────────────────────────────
  app:
    build:
      context: ./backend      # Dockerfile 所在目录（构建上下文）
      dockerfile: Dockerfile   # 指定 Dockerfile 文件名
      target: production       # 多阶段构建：只构建 production 阶段

    container_name: oral_arithmetic_app
    restart: unless-stopped

    # env_file：加载 .env 文件中的所有变量
    env_file:
      - ./backend/.env

    # environment：额外的环境变量，优先级高于 env_file
    # 关键：在 Docker 容器内，MySQL 和 Redis 通过服务名（而非 127.0.0.1）访问
    # Docker Compose 内置 DNS：服务名 mysql 解析为 MySQL 容器的内部 IP
    environment:
      DB_HOST: mysql      # 覆盖 .env 中的 DB_HOST=127.0.0.1
      REDIS_HOST: redis   # 覆盖 .env 中的 REDIS_HOST=127.0.0.1
      NODE_ENV: production

    ports:
      - "${PORT:-3000}:3000"

    # depends_on + condition: service_healthy：
    # 等待 mysql 和 redis 都通过健康检查后，再启动 app
    # 避免 app 启动时 MySQL/Redis 还未就绪，导致连接失败崩溃
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

    networks:
      - oral_arithmetic_net

    # 日志驱动：限制容器日志文件大小，防止磁盘被日志撑满
    logging:
      driver: json-file
      options:
        max-size: "10m"  # 单个日志文件最大 10MB
        max-file: "3"    # 最多保留 3 个文件（滚动，共最多 30MB）

# ── 数据卷（持久化）─────────────────────────────────────────
volumes:
  mysql-data:
    name: oral_arithmetic_mysql_data
  redis-data:
    name: oral_arithmetic_redis_data

# ── 自定义网络 ───────────────────────────────────────────────
networks:
  oral_arithmetic_net:
    name: oral_arithmetic_network
    driver: bridge
    # bridge 网络：容器可以相互通信，但与外部网络隔离
    # 容器之间用服务名通信（app → mysql:3306），不暴露给宿主机
```

---

## 8.4 容器间通信原理

这是 Docker 初学者最常见的困惑：为什么 `.env` 中写 `DB_HOST=127.0.0.1`，但 Docker 中必须改成 `DB_HOST=mysql`？

```
宿主机视角：
  - 你的 macOS 是宿主机
  - MySQL 容器的 3306 端口被映射到宿主机的 3306
  - 所以在宿主机上，127.0.0.1:3306 可以连接 MySQL ✓

容器（app）视角：
  - app 容器有自己的网络命名空间（namespace）
  - 在 app 容器内，127.0.0.1 是 app 容器自身的地址
  - MySQL 不在 app 容器内，所以 127.0.0.1:3306 连不到 MySQL ✗
  - app 和 mysql 在同一个 Docker 网络（oral_arithmetic_net）
  - Docker 的内置 DNS 将服务名 "mysql" 解析为 mysql 容器的内部 IP
  - 所以在 app 容器内，用 mysql:3306 可以访问 MySQL ✓
```

这就是 `docker-compose.yml` 中用 `environment` 覆盖 `DB_HOST=mysql` 的原因。

---

## 8.5 一键启动与常用命令

```bash
# 首次使用
cp backend/.env.example backend/.env
# 修改 backend/.env 中的密码（至少改 DB_PASSWORD 和 JWT_SECRET）

# 构建镜像并后台启动所有服务
docker compose up -d

# 查看服务状态（STATUS 列应显示 healthy）
docker compose ps

# 查看应用日志（实时）
docker compose logs -f app

# 查看 MySQL 日志（初始化阶段）
docker compose logs mysql

# 进入 app 容器的 shell（调试用）
docker compose exec app sh

# 进入 MySQL 容器执行 SQL
docker compose exec mysql mysql -u root -p oral_arithmetic

# 停止服务（数据卷保留）
docker compose down

# 停止服务并删除数据卷（清空数据库和 Redis，重置到初始状态）
docker compose down -v

# 重新构建镜像（修改了代码后）
docker compose build app
docker compose up -d app  # 仅重启 app 服务
```

---

## 8.6 验证 Docker 部署成功

**步骤 1：确认所有服务 healthy**

```bash
docker compose ps
```

预期输出（STATUS 列显示 healthy）：

```
NAME                      IMAGE              STATUS
oral_arithmetic_mysql     mysql:8.0          Up 2 minutes (healthy)
oral_arithmetic_redis     redis:7-alpine     Up 2 minutes (healthy)
oral_arithmetic_app       backend-app        Up 1 minute (healthy)
```

**步骤 2：测试健康检查接口**

```bash
curl http://localhost:3000/health
```

预期：

```json
{"code":200,"message":"ok","data":{"status":"running","time":"..."}}
```

**步骤 3：测试登录接口（端到端验证 DB + Redis 均正常）**

```bash
curl -X POST http://localhost:3000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"account":"student001","password":"123456"}'
```

预期：

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGci...",
    "role": "student",
    "userInfo": { "userId": 1, "account": "student001", "name": "张三" }
  }
}
```

**步骤 4：在容器中验证 Redis 有 token**

```bash
# 进入 Redis 容器
docker compose exec redis redis-cli

# 查询所有 token key
127.0.0.1:6379> KEYS token:*
1) "token:1_student"

# 查看 token 值和剩余 TTL
127.0.0.1:6379> GET token:1_student
"eyJhbGci..."
127.0.0.1:6379> TTL token:1_student
(integer) 7198
```

**步骤 5：访问 Swagger 文档**

打开浏览器访问 `http://localhost:3000/api-docs`，应显示接口文档页面。

在页面右上角点击 `Authorize`，输入登录获得的 token（格式：`Bearer eyJhbGci...`），之后所有需要认证的接口都可以直接在文档页面测试。

---

# 九、完整请求生命周期追踪

以"学生提交答案"为例，追踪一个请求从微信小程序到数据库的完整路径：

```
微信小程序
  wx.request({
    url: 'http://localhost:3000/api/problems/submit',
    method: 'POST',
    header: { Authorization: 'Bearer eyJhbGci...' },
    data: { problem_id: 42, answer_content: '15', answer_time_seconds: 8.5 }
  })
        ↓ TCP 连接 → HTTP 请求

Express 应用（app.ts 中间件链）
  ↓
cors 中间件：检查 Origin，添加 Access-Control-Allow-Origin 响应头
  ↓
express.json()：将请求体 JSON 字符串解析为 req.body 对象
  ↓
requestLoggerMiddleware（pino-http）
  → 记录请求开始时间
  → 注册 res.end 钩子（响应发出时记录状态码和耗时）
  → req.log = 绑定了 reqId 的 logger 实例
  ↓
路由匹配：POST /api/problems/submit → problem.routes.ts
  ↓
authMiddleware
  → 提取 Header 中的 Bearer token
  → jwt.verify(token, JWT_SECRET)
    → 解码 payload: { userId: 1, role: 'student', exp: 1700007200 }
    → 验证签名 ✓，验证过期 ✓
  → redisService.validateToken(1, 'student', token)
    → redisClient.get('token:1_student') → '同一个 token' ✓
  → redisService.refreshTokenTTL(1, 'student')
    → redisClient.expire('token:1_student', 7200)  // 滑动过期
  → req.user = { userId: 1, account: 'student001', role: 'student' }
  → next()
  ↓
validate(submitAnswerSchema)
  → zod.safeParse(req.body):
    problem_id: 42 (正整数) ✓
    answer_content: "15" (非空字符串) ✓
    answer_time_seconds: 8.5 (0-3600) ✓
    is_review: 默认值 false（Zod 填充）
  → req.body = { problem_id: 42, answer_content: '15',
                  answer_time_seconds: 8.5, is_review: false }
  → next()
  ↓
submitAnswer controller（problem.controller.ts）
  → studentId = req.user.userId = 1
  → role 检查：'student' ✓
  → dto = req.body（已校验，类型安全）
  → problemService.submitAnswer(1, dto)
  ↓
problemService.submitAnswer（problem.service.ts）
  ↓
  → pool.execute('SELECT * FROM problem WHERE problem_id = 42 ...')
    → MySQL 返回题目：{ problem_id: 42, problem_content: '7+8=?',
                        standard_answer: '15', ... }
  ↓
  → normalizeAnswer('15') === normalizeAnswer('15')  → true，答对
  → isCorrect = true, score = 10
  ↓
  → pool.execute('INSERT INTO training_record ...', [1, 42, '15', true, 8.5, 10, ...])
    → MySQL 写入成功，insertId = 101
  ↓
  → pool.execute('UPDATE problem SET usage_frequency = usage_frequency + 1 ...')
  ↓
  → 答对，更新 mistake_book is_corrected = true（如果该题在错题本中）
  ↓
  → updateStudentLevel(1)
    → pool.execute('SELECT is_correct FROM training_record WHERE student_id = 1
                    ORDER BY created_time DESC LIMIT 20')
      → 20条记录，18条正确 → rate = 90%
    → 90% >= 85%，且已有20条记录 → 升级！
    → pool.execute('UPDATE student_level SET current_level = 4 ...')
    → pool.execute('UPDATE student SET current_level = 4 ...')
    → return { newLevel: 4, rate: 90 }
  ↓
  → statsService.upsertDailyStat(1)
    → redisClient.del('stats:summary:1')  // 主动失效摘要缓存
    → pool.execute('INSERT INTO learning_statistic ... ON DUPLICATE KEY UPDATE ...')
  ↓
  → return { is_correct: true, score: 10, level_changed: true, new_level: 4, ... }
  ↓
success(res, result, '回答正确！恭喜升级到 Level 4！')
  → res.status(200).json({
      code: 200,
      message: '回答正确！恭喜升级到 Level 4！',
      data: { is_correct: true, score: 10, level_changed: true, new_level: 4,
              recent_20_correct_rate: 90.0, ... }
    })
  ↓
res.end() 触发 pino-http 的钩子
  → 计算 responseTime = 现在时间 - 请求开始时间 = 47ms
  → logger.info({
      method: 'POST', url: '/api/problems/submit',
      statusCode: 200, responseTime: 47
    }, 'POST /api/problems/submit → 200')
  ↓
HTTP 响应返回微信小程序
  → 小程序显示：回答正确！恭喜升级到 Level 4！
```

这条链路展示了本项目每一个技术组件的协作关系，也是整个文档内容的汇聚点。

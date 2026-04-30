/**
 * 文件说明：Express 应用入口
 * 系统作用：注册全局中间件、挂载所有路由、启动 HTTP 服务、初始化 DB/Redis 连接
 * 调用链：Node 进程 → app.ts → 注册路由 → controller → service → DB/Redis
 *
 * 路由总览：
 *   POST /api/auth/student/login    学生登录
 *   POST /api/auth/teacher/login    教师登录
 *   POST /api/auth/logout           登出（需 token）
 *   GET  /api/problems/generate     随机出题
 *   POST /api/problems/submit       提交答案 + 判题
 *   GET  /api/mistakes              获取错题本
 *   DELETE /api/mistakes/:id        删除单条错题
 *   GET  /api/stats/summary         统计摘要
 *   GET  /api/stats/daily           每日统计列表
 *   GET  /api/student/info          学生信息
 *   GET  /api/teacher/info          教师信息
 *   POST /api/homework              教师布置作业
 *   POST /api/exam                  教师发布考试
 */
import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

import { testDbConnection } from "./config/database";
import { redisClient } from "./config/redis";
import { errorMiddleware } from "./middlewares/error.middleware";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware";
import { swaggerSpec } from "./docs/swagger";
import logger from "./utils/logger";

import authRoutes from "./routes/auth.routes";
import problemRoutes from "./routes/problem.routes";
import mistakeRoutes from "./routes/mistake.routes";
import statsRoutes from "./routes/stats.routes";
import studentRoutes from "./routes/student.routes";
import teacherRoutes from "./routes/teacher.routes";
import homeworkRoutes from "./routes/homework.routes";
import examRoutes from "./routes/exam.routes";
import mapRoutes from "./routes/map.routes";

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;
const SWAGGER_PATH = process.env.SWAGGER_PATH || "/api-docs";

// ── 全局中间件 ───────────────────────────────────────────────
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }),
);
// Express 内置 body-parser 功能，限制请求体大小为 1MB，防止恶意请求导致内存溢出
app.use(express.json({ limit: "1mb" }));
// 解析 URL-encoded 数据（如表单提交），extended: true 支持复杂对象嵌套
app.use(express.urlencoded({ extended: true }));
// pino-http 替换 morgan：结构化请求日志，自动挂载 req.log 到每个请求上下文
app.use(requestLoggerMiddleware);

// ── Swagger 接口文档（/api-docs）────────────────────────────
// 仅开发环境或未设置 DISABLE_SWAGGER=true 时挂载
if (process.env.DISABLE_SWAGGER !== "true") {
  app.use(
    SWAGGER_PATH,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "口算训练系统 API 文档",
      swaggerOptions: { persistAuthorization: true }, // 刷新页面后保留 token
    }),
  );
  // 提供原始 JSON 供外部工具消费（如 Postman Import）
  app.get(`${SWAGGER_PATH}.json`, (_req, res) => res.json(swaggerSpec));
}

// ── 路由挂载 ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/mistakes", mistakeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/map", mapRoutes);

// ── 健康检查 ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    code: 200,
    message: "ok",
    data: { status: "running", time: new Date() },
  });
});

// ── 404 处理 ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: "接口不存在", data: null });
});

// ── 全局错误处理（必须在所有路由之后） ────────────────────────
app.use(errorMiddleware);

// ── 启动服务 ─────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    // 启动前测试数据库和 Redis 连接，确保配置正确，避免运行时错误
    await testDbConnection();
    await redisClient.ping();
    // 启动 Express HTTP 服务器
    app.listen(PORT, () => {
      logger.info(`[Server] 启动成功 → http://localhost:${PORT}`);
      logger.info(`[Server] 环境: ${process.env.NODE_ENV}`);
      if (process.env.DISABLE_SWAGGER !== "true") {
        logger.info(
          `[Swagger] 接口文档 → http://localhost:${PORT}${SWAGGER_PATH}`,
        );
      }
    });
  } catch (err) {
    logger.error({ err }, "[Server] 启动失败");
    process.exit(1);
  }
}

bootstrap();

export default app;

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
 */
import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { testDbConnection } from "./config/database";
import { redisClient } from "./config/redis";
import { errorMiddleware } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import problemRoutes from "./routes/problem.routes";
import mistakeRoutes from "./routes/mistake.routes";
import statsRoutes from "./routes/stats.routes";

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

// ── 全局中间件 ───────────────────────────────────────────────
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ── 路由挂载 ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/mistakes", mistakeRoutes);
app.use("/api/stats", statsRoutes);

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
    await testDbConnection();
    await redisClient.ping();
    app.listen(PORT, () => {
      console.log(`\n[Server] 启动成功 → http://localhost:${PORT}`);
      console.log("[Server] 环境:", process.env.NODE_ENV);
    });
  } catch (err) {
    console.error("[Server] 启动失败:", err);
    process.exit(1);
  }
}

bootstrap();

export default app;

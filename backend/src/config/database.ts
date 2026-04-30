/**
 * 文件说明：MySQL 数据库连接池配置
 * 系统作用：统一管理数据库连接，所有 service 层通过此连接池执行 SQL
 * 调用链：service → pool.execute(sql) → MySQL
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import logger from "../utils/logger";

// 加载环境变量（支持 .env 文件）
dotenv.config();

// 创建 MySQL 连接池，支持环境变量配置（默认值适用于本地开发）
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Root@123456",
  database: process.env.DB_NAME || "oral_arithmetic",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "+08:00",
});

// 测试数据库连接，确保配置正确
export async function testDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  logger.info(`[DB] MySQL 连接成功,host: ${process.env.DB_HOST}`);
  conn.release();
}

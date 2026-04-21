/**
 * 文件说明：JWT 配置常量
 * 系统作用：集中管理 JWT 签发/验证所需的密钥和过期时间
 * 调用链：auth.service → sign(payload, JWT_SECRET) → token 字符串
 */
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET: string = process.env.JWT_SECRET || 'oral_arithmetic_jwt_secret_2024';
export const JWT_EXPIRES_IN: number = Number(process.env.JWT_EXPIRES_IN) || 7200;
export const TOKEN_EXPIRES_IN: number = Number(process.env.TOKEN_EXPIRES_IN) || 7200;
export const TOKEN_PREFIX = 'token:';

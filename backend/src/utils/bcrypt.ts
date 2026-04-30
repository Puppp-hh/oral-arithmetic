/**
 * 文件说明：密码加密与校验工具
 * 系统作用：使用 bcryptjs 对密码进行哈希加密，防止明文存储
 * 调用链：register → hashPassword → DB存储；login → comparePassword → 验证
 */
import bcrypt from "bcryptjs";

// bcrypt 的 salt rounds，10 是一个常用的平衡安全性和性能的选择
const SALT_ROUNDS = 10;

// 对明文密码进行哈希加密，返回哈希值
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// 比较明文密码和哈希值是否匹配，返回布尔结果
export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

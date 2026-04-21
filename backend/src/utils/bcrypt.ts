/**
 * 文件说明：密码加密与校验工具
 * 系统作用：使用 bcryptjs 对密码进行哈希加密，防止明文存储
 * 调用链：register → hashPassword → DB存储；login → comparePassword → 验证
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

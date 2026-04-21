/**
 * 文件说明：认证 service（完整版）
 * 系统作用：
 *   1. studentLogin   / teacherLogin  → 验密 + 签 JWT + Redis 写 token
 *   2. studentRegister                → bcrypt 加密注册
 *   3. refreshToken                   → 验旧 token → 签新 token → 覆盖 Redis
 *   4. getTokenInfo                   → 返回 token 剩余 TTL
 *
 * 调用链：
 *   authController → authService → pool(DB) + redisService(Redis)
 *
 * Redis Key：token:{userId}_{role}  EX TOKEN_EXPIRES_IN(秒)
 */
import { pool } from '../config/database';
import { redisService } from './redis.service';
import { comparePassword, hashPassword } from '../utils/bcrypt';
import { signToken, verifyToken } from '../utils/jwt';
import { redisClient } from '../config/redis';
import { TOKEN_PREFIX, TOKEN_EXPIRES_IN } from '../config/jwt';
import {
  Student,
  Teacher,
  LoginResult,
  StudentPublic,
  TeacherPublic,
} from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ── 注册 DTO ──────────────────────────────────────────────────
export interface StudentRegisterDto {
  account: string;
  password: string;
  name: string;
  class_id: number;
  grade_id: number;
  gender?: 'male' | 'female' | 'unknown';
}

export interface TokenInfo {
  userId: number;
  account: string;
  role: string;
  ttl: number;
}

export const authService = {

  // ── 学生登录 ─────────────────────────────────────────────
  async studentLogin(account: string, password: string): Promise<LoginResult> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM student
       WHERE account = ? AND account_status = 'active' LIMIT 1`,
      [account]
    );
    if (rows.length === 0) throw new Error('账号不存在或已被禁用');

    const student = rows[0] as Student;
    const match = await comparePassword(password, student.password);
    if (!match) throw new Error('密码错误');

    // 更新最后登录时间
    await pool.execute(
      'UPDATE student SET last_login_time = NOW() WHERE student_id = ?',
      [student.student_id]
    );

    const payload = {
      userId: student.student_id,
      account: student.account,
      role: 'student' as const,
    };
    const token = signToken(payload);

    // 写入 Redis（单点登录：新登录覆盖旧 token）
    await redisService.setToken(student.student_id, 'student', token);

    const { password: _pw, ...userInfo } = student;
    return { token, userInfo: userInfo as StudentPublic, role: 'student' };
  },

  // ── 教师登录 ─────────────────────────────────────────────
  async teacherLogin(account: string, password: string): Promise<LoginResult> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM teacher
       WHERE account = ? AND account_status = 'active' LIMIT 1`,
      [account]
    );
    if (rows.length === 0) throw new Error('账号不存在或已被禁用');

    const teacher = rows[0] as Teacher;
    const match = await comparePassword(password, teacher.password);
    if (!match) throw new Error('密码错误');

    const payload = {
      userId: teacher.teacher_id,
      account: teacher.account,
      role: 'teacher' as const,
    };
    const token = signToken(payload);
    await redisService.setToken(teacher.teacher_id, 'teacher', token);

    const { password: _pw, ...userInfo } = teacher;
    return { token, userInfo: userInfo as TeacherPublic, role: 'teacher' };
  },

  // ── 学生注册 ─────────────────────────────────────────────
  async studentRegister(dto: StudentRegisterDto): Promise<StudentPublic> {
    // 检查账号唯一性
    const [exist] = await pool.execute<RowDataPacket[]>(
      'SELECT student_id FROM student WHERE account = ? LIMIT 1',
      [dto.account]
    );
    if (exist.length > 0) throw new Error('账号已存在');

    // 验证 class_id 和 grade_id 合法性
    const [classRow] = await pool.execute<RowDataPacket[]>(
      'SELECT class_id FROM class WHERE class_id = ? AND class_status = "active" LIMIT 1',
      [dto.class_id]
    );
    if (classRow.length === 0) throw new Error('班级不存在或已停用');

    const pwdHash = await hashPassword(dto.password);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO student
         (account, password, name, class_id, grade_id, gender, current_level, account_status)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'active')`,
      [
        dto.account,
        pwdHash,
        dto.name,
        dto.class_id,
        dto.grade_id,
        dto.gender ?? 'unknown',
      ]
    );
    const newId = result.insertId;

    // 初始化 student_level 1:1
    await pool.execute(
      'INSERT INTO student_level (student_id, current_level) VALUES (?, 1)',
      [newId]
    );

    // 更新班级学生数
    await pool.execute(
      'UPDATE class SET student_count = student_count + 1 WHERE class_id = ?',
      [dto.class_id]
    );

    const [newRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student WHERE student_id = ? LIMIT 1',
      [newId]
    );
    const { password: _pw, ...pub } = newRows[0] as Student;
    return pub as StudentPublic;
  },

  // ── Token 刷新（换发新 token，旧 token 立即失效） ─────────
  async refreshToken(oldToken: string): Promise<{ token: string; expiresIn: number }> {
    let payload: { userId: number; account: string; role: 'student' | 'teacher' };
    try {
      payload = verifyToken(oldToken) as typeof payload;
    } catch {
      throw new Error('token 无效或已过期');
    }

    const valid = await redisService.validateToken(payload.userId, payload.role, oldToken);
    if (!valid) throw new Error('token 已失效，请重新登录');

    const newToken = signToken({
      userId: payload.userId,
      account: payload.account,
      role: payload.role,
    });
    await redisService.setToken(payload.userId, payload.role, newToken);

    return { token: newToken, expiresIn: TOKEN_EXPIRES_IN };
  },

  // ── 查询 token 信息（调试 / 前端展示剩余有效期） ──────────
  async getTokenInfo(userId: number, role: string): Promise<TokenInfo | null> {
    const key = `${TOKEN_PREFIX}${userId}_${role}`;
    const [token, ttl] = await Promise.all([
      redisClient.get(key),
      redisClient.ttl(key),
    ]);
    if (!token) return null;
    const payload = verifyToken(token);
    return { userId, account: payload.account, role, ttl };
  },
};

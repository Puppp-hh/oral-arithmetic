import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { StudentPublic, StudentLevel } from '../types';
import { classService } from './class.service';
import { comparePassword, hashPassword } from '../utils/bcrypt';

export const studentService = {
  async getInfo(studentId: number): Promise<StudentPublic> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT student_id, account, name, class_id, grade_id,
              school_name, school_address, school_longitude, school_latitude,
              gender,
              register_date, last_login_time, current_level,
              total_problems, cumulative_correct_rate, account_status
       FROM student WHERE student_id = ? LIMIT 1`,
      [studentId],
    );
    if (rows.length === 0) throw new Error('学生不存在');
    return rows[0] as StudentPublic;
  },

  async getLevel(studentId: number): Promise<StudentLevel & { level_title: string }> {
    const LEVEL_TITLES: Record<number, string> = {
      1: '口算萌新', 2: '数字学徒', 3: '加减能手', 4: '运算达人', 5: '乘除小侠',
      6: '混合高手', 7: '速算健将', 8: '数学精英', 9: '口算大师', 10: '传说天才',
    };
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT sl.*, s.current_level as student_current_level
       FROM student_level sl
       JOIN student s ON sl.student_id = s.student_id
       WHERE sl.student_id = ? LIMIT 1`,
      [studentId],
    );
    if (rows.length === 0) throw new Error('等级记录不存在');
    const lvl = rows[0] as StudentLevel;
    return {
      ...lvl,
      level_title: LEVEL_TITLES[lvl.current_level] ?? `等级${lvl.current_level}`,
    };
  },

  async bindInviteCode(studentId: number, inviteCode: string): Promise<StudentPublic> {
    const classInfo = await classService.verifyInviteCode(inviteCode);

    const [currentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT class_id FROM student WHERE student_id = ? LIMIT 1',
      [studentId],
    );
    if (currentRows.length === 0) throw new Error('学生不存在');

    const oldClassId: number | null = currentRows[0].class_id ?? null;

    await pool.execute(
      'UPDATE student SET class_id = ?, grade_id = ? WHERE student_id = ?',
      [classInfo.class_id, classInfo.grade_id, studentId],
    );

    if (oldClassId && oldClassId !== classInfo.class_id) {
      await pool.execute(
        'UPDATE class SET student_count = GREATEST(0, student_count - 1) WHERE class_id = ?',
        [oldClassId],
      );
    }
    await pool.execute(
      'UPDATE class SET student_count = student_count + 1 WHERE class_id = ?',
      [classInfo.class_id],
    );

    return studentService.getInfo(studentId);
  },

  async resetPassword(
    studentId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT password FROM student WHERE student_id = ? LIMIT 1',
      [studentId],
    );
    if (rows.length === 0) throw new Error('学生不存在');

    const matched = await comparePassword(oldPassword, rows[0].password);
    if (!matched) throw new Error('原密码不正确');

    const hashed = await hashPassword(newPassword);
    await pool.execute(
      'UPDATE student SET password = ? WHERE student_id = ?',
      [hashed, studentId],
    );
  },
};

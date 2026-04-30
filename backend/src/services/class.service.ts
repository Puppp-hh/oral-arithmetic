import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { StudentPublic } from '../types';

export interface CreateClassDto {
  className: string;
  gradeId: number;
}

export interface ClassInfo {
  class_id: number;
  class_name: string;
  grade_id: number;
  grade_name: string;
  teacher_id: number;
  student_count: number;
  class_status: 'active' | 'inactive';
  invite_code: string | null;
  invite_code_status: 'active' | 'disabled';
  invite_code_expire_time: Date | null;
  created_date: Date;
}

export interface InviteCodeInfo {
  class_id:                number;
  class_name:              string;
  grade_name:              string;
  invite_code:             string;
  invite_code_status:      'active' | 'disabled';
  invite_code_expire_time: Date | null;
}

export interface VerifiedClass {
  class_id: number;
  grade_id: number;
  teacher_id: number;
  class_name: string;
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT class_id FROM class WHERE invite_code = ? LIMIT 1',
      [code],
    );
    if (rows.length === 0) return code;
  }
  throw new Error('邀请码生成失败，请重试');
}

function assertOwner(classRow: RowDataPacket | undefined, teacherId: number): void {
  if (!classRow) throw new Error('班级不存在');
  if (classRow.teacher_id !== teacherId) throw new Error('无权操作该班级');
}

export const classService = {
  async createClass(teacherId: number, dto: CreateClassDto): Promise<ClassInfo> {
    const [teacherRows] = await pool.execute<RowDataPacket[]>(
      'SELECT school_name FROM teacher WHERE teacher_id = ? LIMIT 1',
      [teacherId],
    );
    if (teacherRows.length === 0) throw new Error('教师不存在');

    const [gradeRows] = await pool.execute<RowDataPacket[]>(
      'SELECT grade_id, grade_name FROM grade WHERE grade_id = ? LIMIT 1',
      [dto.gradeId],
    );
    if (gradeRows.length === 0) throw new Error('年级不存在');

    const schoolName = (teacherRows[0].school_name || '').trim();
    if (schoolName) {
      const [duplicateRows] = await pool.execute<RowDataPacket[]>(
        `SELECT c.class_id
         FROM class c
         JOIN teacher t ON t.teacher_id = c.teacher_id
         WHERE c.class_status = 'active'
           AND c.grade_id = ?
           AND c.class_name = ?
           AND t.school_name = ?
         LIMIT 1`,
        [dto.gradeId, dto.className, schoolName],
      );
      if (duplicateRows.length > 0) {
        throw new Error('同一学校下已存在该班级，请选择其他班级');
      }
    }

    const inviteCode = await generateUniqueInviteCode();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO class (grade_id, class_name, teacher_id, invite_code, invite_code_status, class_status)
       VALUES (?, ?, ?, ?, 'active', 'active')`,
      [dto.gradeId, dto.className, teacherId, inviteCode],
    );

    await pool.execute(
      'UPDATE grade SET class_count = class_count + 1 WHERE grade_id = ?',
      [dto.gradeId],
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, g.grade_name
       FROM class c JOIN grade g ON c.grade_id = g.grade_id
       WHERE c.class_id = ? LIMIT 1`,
      [result.insertId],
    );
    return rows[0] as ClassInfo;
  },

  async deleteClass(classId: number, teacherId: number): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT teacher_id, grade_id, student_count
       FROM class
       WHERE class_id = ? AND class_status = 'active'
       LIMIT 1`,
      [classId],
    );
    const classRow = rows[0];
    assertOwner(classRow, teacherId);

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM student
       WHERE class_id = ? AND account_status != 'banned'`,
      [classId],
    );
    const total = Number(countRows[0]?.total ?? 0);
    if (total > 0) throw new Error('班级内还有学生，不能删除');

    await pool.execute(
      `UPDATE class
       SET class_status = 'inactive', invite_code_status = 'disabled'
       WHERE class_id = ?`,
      [classId],
    );

    await pool.execute(
      'UPDATE grade SET class_count = GREATEST(class_count - 1, 0) WHERE grade_id = ?',
      [classRow.grade_id],
    );
  },

  async getTeacherClasses(teacherId: number): Promise<ClassInfo[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, g.grade_name
       FROM class c JOIN grade g ON c.grade_id = g.grade_id
       WHERE c.teacher_id = ? AND c.class_status = 'active'
       ORDER BY c.created_date DESC`,
      [teacherId],
    );
    return rows as ClassInfo[];
  },

  async getInviteCode(classId: number, teacherId: number): Promise<InviteCodeInfo & { class_name: string; grade_name: string }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.teacher_id, c.class_name, c.invite_code, c.invite_code_status,
              c.invite_code_expire_time, g.grade_name
       FROM class c JOIN grade g ON c.grade_id = g.grade_id
       WHERE c.class_id = ? LIMIT 1`,
      [classId],
    );
    assertOwner(rows[0], teacherId);
    const row = rows[0];
    return {
      class_id:                classId,
      class_name:              row.class_name,
      grade_name:              row.grade_name,
      invite_code:             row.invite_code,
      invite_code_status:      row.invite_code_status,
      invite_code_expire_time: row.invite_code_expire_time,
    };
  },

  async refreshInviteCode(classId: number, teacherId: number): Promise<InviteCodeInfo> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.teacher_id, c.class_name, g.grade_name
       FROM class c JOIN grade g ON c.grade_id = g.grade_id
       WHERE c.class_id = ? LIMIT 1`,
      [classId],
    );
    assertOwner(rows[0], teacherId);

    const newCode = await generateUniqueInviteCode();
    await pool.execute(
      `UPDATE class SET invite_code = ?, invite_code_status = 'active' WHERE class_id = ?`,
      [newCode, classId],
    );
    return {
      class_id:                classId,
      class_name:              rows[0].class_name,
      grade_name:              rows[0].grade_name,
      invite_code:             newCode,
      invite_code_status:      'active',
      invite_code_expire_time: null,
    };
  },

  async getClassStudents(
    classId: number,
    teacherId: number,
  ): Promise<{ list: StudentPublic[]; total: number }> {
    const [classRows] = await pool.execute<RowDataPacket[]>(
      'SELECT teacher_id FROM class WHERE class_id = ? LIMIT 1',
      [classId],
    );
    assertOwner(classRows[0], teacherId);

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM student WHERE class_id = ? AND account_status != 'banned'`,
      [classId],
    );
    const total = Number(countRows[0].total);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT student_id, account, name, class_id, grade_id, gender,
              register_date, last_login_time, current_level,
              total_problems, cumulative_correct_rate, account_status
       FROM student WHERE class_id = ? AND account_status != 'banned'
       ORDER BY register_date ASC`,
      [classId],
    );
    return { list: rows as StudentPublic[], total };
  },

  async verifyInviteCode(inviteCode: string): Promise<VerifiedClass> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT class_id, grade_id, teacher_id, class_name, invite_code_status, invite_code_expire_time
       FROM class
       WHERE invite_code = ? AND class_status = 'active' LIMIT 1`,
      [inviteCode],
    );
    if (rows.length === 0) throw new Error('邀请码无效或班级不存在');

    const row = rows[0];
    if (row.invite_code_status !== 'active') throw new Error('该邀请码已停用');
    if (row.invite_code_expire_time && new Date(row.invite_code_expire_time) < new Date()) {
      throw new Error('该邀请码已过期');
    }

    return {
      class_id: row.class_id,
      grade_id: row.grade_id,
      teacher_id: row.teacher_id,
      class_name: row.class_name,
    };
  },
};

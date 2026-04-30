import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { TeacherPublic, StudentPublic } from '../types';
import { hashPassword } from '../utils/bcrypt';

const LEVEL_TITLES: Record<number, string> = {
  1: '口算萌新', 2: '数字学徒', 3: '加减能手', 4: '运算达人', 5: '乘除小侠',
  6: '混合高手', 7: '速算健将', 8: '数学精英', 9: '口算大师', 10: '传说天才',
};

export interface StudentListParams {
  teacherId: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  classId?: number;
}

export interface StudentDetailStats {
  overview:       Record<string, unknown>;
  daily:          Record<string, unknown>[];
  level:          Record<string, unknown>;
  mistakes_count: number;
}

export interface ClassStats {
  student_count:    number;
  avg_correct_rate: number;
  homework_count:   number;
  exam_count:       number;
  top_mistakes:     Array<{ problem_content: string; error_count: number }>;
}

export const teacherService = {
  async getInfo(teacherId: number): Promise<TeacherPublic> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT teacher_id, name, account, email, phone, teaching_subjects, created_date, account_status
       FROM teacher WHERE teacher_id = ? LIMIT 1`,
      [teacherId],
    );
    if (rows.length === 0) throw new Error('教师不存在');
    return rows[0] as TeacherPublic;
  },

  async getStudentList(params: StudentListParams): Promise<{ list: StudentPublic[]; total: number }> {
    const page     = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const offset   = (page - 1) * pageSize;

    let whereSql = "WHERE s.account_status = 'active' AND c.teacher_id = ?";
    const args: (string | number)[] = [params.teacherId];

    if (params.classId) {
      whereSql += ' AND s.class_id = ?';
      args.push(params.classId);
    }

    if (params.keyword?.trim()) {
      whereSql += ' AND (s.name LIKE ? OR s.account LIKE ?)';
      const kw = `%${params.keyword.trim()}%`;
      args.push(kw, kw);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM student s
       JOIN class c ON c.class_id = s.class_id
       ${whereSql}`,
      args,
    );
    const total: number = countRows[0].total;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.student_id, s.account, s.name, s.class_id, s.grade_id, s.gender,
              s.school_name, s.school_address, s.school_longitude, s.school_latitude,
              s.register_date, s.last_login_time, s.current_level,
              s.total_problems, s.cumulative_correct_rate, s.account_status,
              c.class_name, g.grade_name
       FROM student s
       JOIN class c ON c.class_id = s.class_id
       JOIN grade g ON g.grade_id = s.grade_id
       ${whereSql}
       ORDER BY s.student_id
       LIMIT ${pageSize} OFFSET ${offset}`,
      args,
    );

    return { list: rows as StudentPublic[], total };
  },

  async getStudentDetail(studentId: number): Promise<StudentPublic> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT student_id, account, name, class_id, grade_id, gender,
              school_name, school_address, school_longitude, school_latitude,
              register_date, last_login_time, current_level,
              total_problems, cumulative_correct_rate, account_status
       FROM student WHERE student_id = ? LIMIT 1`,
      [studentId],
    );
    if (rows.length === 0) throw new Error('学生不存在');
    return rows[0] as StudentPublic;
  },

  async getStudentStats(studentId: number): Promise<StudentDetailStats> {
    const [studentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT total_problems, cumulative_correct_rate, current_level FROM student WHERE student_id = ?`,
      [studentId],
    );
    const [levelRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM student_level WHERE student_id = ? LIMIT 1`,
      [studentId],
    );
    const [dailyRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(statistic_date,'%Y-%m-%d') AS statistic_date,
              daily_problems, daily_correct, daily_wrong, daily_correct_rate
       FROM learning_statistic WHERE student_id = ?
         AND statistic_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY statistic_date DESC`,
      [studentId],
    );
    const [mistakeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM mistake_book WHERE student_id = ? AND is_corrected = FALSE`,
      [studentId],
    );

    const s = studentRows[0] ?? {};
    const lvl = levelRows[0] ?? {};
    return {
      overview: {
        total_problems:          s.total_problems ?? 0,
        cumulative_correct_rate: parseFloat(s.cumulative_correct_rate) || 0,
        current_level:           s.current_level ?? 1,
        recent_20_correct_rate:  parseFloat(lvl.recent_20_correct_rate) || 0,
      },
      level: {
        ...lvl,
        level_title: LEVEL_TITLES[lvl.current_level ?? 1] ?? `等级${lvl.current_level}`,
      },
      daily:          dailyRows,
      mistakes_count: Number(mistakeRows[0]?.cnt ?? 0),
    };
  },

  async resetStudentPassword(studentId: number): Promise<{ temp_password: string }> {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const temp  = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hashed = await hashPassword(temp);
    const [result] = await pool.execute<RowDataPacket[]>(
      'UPDATE student SET password = ? WHERE student_id = ?',
      [hashed, studentId],
    );
    return { temp_password: temp };
  },

  async getClassStats(teacherId: number, classId?: number): Promise<ClassStats> {
    const classFilter = classId ? ' AND c.class_id = ?' : '';
    const classArgs: number[] = classId ? [teacherId, classId] : [teacherId];

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt, ROUND(AVG(cumulative_correct_rate), 2) AS avg_rate
       FROM student s
       JOIN class c ON c.class_id = s.class_id
       WHERE s.account_status = 'active' AND c.teacher_id = ?${classFilter}`,
      classArgs,
    );

    const [hwRows] = classId
      ? await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT h.homework_id) AS cnt
           FROM homework h
           JOIN homework_student hs ON hs.homework_id = h.homework_id
           JOIN student s ON s.student_id = hs.student_id
           JOIN class c ON c.class_id = s.class_id
           WHERE h.teacher_id = ? AND c.class_id = ?`,
          [teacherId, classId],
        )
      : await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM homework WHERE teacher_id = ?`,
          [teacherId],
        );

    const [examRows] = classId
      ? await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT e.exam_id) AS cnt
           FROM exam e
           JOIN exam_student es ON es.exam_id = e.exam_id
           JOIN student s ON s.student_id = es.student_id
           JOIN class c ON c.class_id = s.class_id
           WHERE e.teacher_id = ? AND c.class_id = ?`,
          [teacherId, classId],
        )
      : await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM exam WHERE teacher_id = ?`,
          [teacherId],
        );

    const [mistakeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_content, COUNT(*) AS error_count
       FROM mistake_book mb
       JOIN problem p ON mb.problem_id = p.problem_id
       JOIN student s ON s.student_id = mb.student_id
       JOIN class c ON c.class_id = s.class_id
       WHERE c.teacher_id = ?${classFilter}
       GROUP BY mb.problem_id
       ORDER BY error_count DESC
       LIMIT 10`,
      classArgs,
    );

    return {
      student_count:    Number(countRows[0]?.cnt ?? 0),
      avg_correct_rate: parseFloat(countRows[0]?.avg_rate) || 0,
      homework_count:   Number(hwRows[0]?.cnt ?? 0),
      exam_count:       Number(examRows[0]?.cnt ?? 0),
      top_mistakes:     mistakeRows as Array<{ problem_content: string; error_count: number }>,
    };
  },
};

import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Problem, OperationType } from '../types';
import {
  generateProblems as dynGenerate,
  normalizeAnswer,
  RawProblem,
} from '../utils/problem-generator';

export interface CreateHomeworkDto {
  title: string;
  operation_type: string;
  difficulty_level: number;
  problem_count: number;
  deadline: string;
  assign_all?: boolean;
  student_ids?: number[];
  class_ids?: number[];
}

export const homeworkService = {
  async createHomework(
    teacherId: number,
    dto: CreateHomeworkDto,
  ): Promise<{ homework_id: number }> {
    const level = Math.min(10, Math.max(1, dto.difficulty_level));
    const count = Math.min(50, Math.max(1, dto.problem_count));

    // ① 从库中取题
    let sql = `SELECT * FROM problem WHERE enable_status = 'enabled' AND difficulty_level = ?`;
    const params: (string | number)[] = [level];
    if (dto.operation_type && dto.operation_type !== 'mixed') {
      sql += ' AND problem_type = ?';
      params.push(dto.operation_type);
    }
    sql += ` LIMIT ${count * 3}`;

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    let problems = rows as Problem[];

    // ② 不足时动态生成
    if (problems.length < count) {
      const needed = count - problems.length + 5;
      const raws = dynGenerate(level, needed, dto.operation_type as OperationType | undefined);
      const inserted = await batchInsertProblems(raws);
      problems = [...problems, ...inserted];
    }

    // ③ 随机切片
    const selected = shuffleAndSlice(problems, count);

    // ④ 写入 homework
    const [hwRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO homework (teacher_id, title, problem_count, difficulty_level, operation_type, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [teacherId, dto.title, selected.length, level, dto.operation_type, dto.deadline],
    );
    const homeworkId = hwRes.insertId;

    // ⑤ 写入 homework_problem
    for (let i = 0; i < selected.length; i++) {
      await pool.execute(
        'INSERT INTO homework_problem (homework_id, problem_id, order_index) VALUES (?, ?, ?)',
        [homeworkId, selected[i].problem_id, i],
      );
    }

    // ⑥ 分配学生
    const assignedStudentIds = await resolveAssignedStudentIds(teacherId, dto);
    for (const sid of assignedStudentIds) {
      await pool.execute(
        'INSERT IGNORE INTO homework_student (homework_id, student_id) VALUES (?, ?)',
        [homeworkId, sid],
      );
    }

    return { homework_id: homeworkId };
  },

  async getTeacherHomeworkList(
    teacherId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: RowDataPacket[]; total: number }> {
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (Math.max(1, Number(page) || 1) - 1) * safePageSize;
    const [countRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM homework WHERE teacher_id = ?',
      [teacherId],
    );
    const total = Number(countRows[0].total);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT h.*,
              COUNT(DISTINCT hs.student_id)  AS total_assigned,
              COUNT(DISTINCT sub.student_id) AS submitted_count
       FROM homework h
       LEFT JOIN homework_student hs    ON hs.homework_id  = h.homework_id
       LEFT JOIN homework_submission sub ON sub.homework_id = h.homework_id
       WHERE h.teacher_id = ?
       GROUP BY h.homework_id
       ORDER BY h.create_time DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
      [teacherId],
    );

    return { list: rows, total };
  },

  async getStudentHomeworkList(
    studentId: number,
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<{ list: RowDataPacket[]; total: number }> {
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (Math.max(1, Number(page) || 1) - 1) * safePageSize;
    const args: (number | string)[] = [studentId];
    let statusSql = '';

    if (status === 'pending') {
      statusSql = ' AND sub.submission_id IS NULL';
    } else if (status === 'submitted') {
      statusSql = ' AND sub.submission_id IS NOT NULL';
    } else if (status) {
      statusSql = ' AND h.status = ?';
      args.push(status);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM homework_student hs
       JOIN homework h ON h.homework_id = hs.homework_id
       LEFT JOIN homework_submission sub
              ON sub.homework_id = h.homework_id AND sub.student_id = hs.student_id
       WHERE hs.student_id = ?${statusSql}`,
      args,
    );
    const total = Number(countRows[0].total);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT h.*,
              IF(sub.submission_id IS NOT NULL, 'submitted', 'pending') AS my_status,
              sub.score          AS my_score,
              sub.correct_count  AS my_correct_count,
              sub.correct_rate   AS my_correct_rate
       FROM homework_student hs
       JOIN homework h ON h.homework_id = hs.homework_id
       LEFT JOIN homework_submission sub
              ON sub.homework_id = h.homework_id AND sub.student_id = hs.student_id
       WHERE hs.student_id = ?${statusSql}
       ORDER BY h.deadline ASC
       LIMIT ${safePageSize} OFFSET ${offset}`,
      args,
    );

    return { list: rows, total };
  },

  async getHomeworkDetail(
    homeworkId: number,
    studentId?: number,
  ): Promise<{
    homework: RowDataPacket;
    problems: RowDataPacket[];
    my_submission: RowDataPacket | null;
  }> {
    const [hwRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM homework WHERE homework_id = ? LIMIT 1',
      [homeworkId],
    );
    if (hwRows.length === 0) throw new Error('作业不存在');

    const [problemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_id, p.problem_content, p.problem_type, p.difficulty_level,
              p.standard_answer, hp.order_index
       FROM homework_problem hp
       JOIN problem p ON p.problem_id = hp.problem_id
       WHERE hp.homework_id = ?
       ORDER BY hp.order_index`,
      [homeworkId],
    );

    let my_submission: RowDataPacket | null = null;
    if (studentId) {
      const [subRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM homework_submission WHERE homework_id = ? AND student_id = ? LIMIT 1',
        [homeworkId, studentId],
      );
      if (subRows.length > 0) {
        my_submission = { ...subRows[0] };
        if (typeof my_submission!.detail === 'string') {
          try { my_submission!.detail = JSON.parse(my_submission!.detail); } catch { /* noop */ }
        }
        if (my_submission!.correct_rate !== null && my_submission!.correct_rate !== undefined) {
          my_submission!.correct_rate = `${parseFloat(my_submission!.correct_rate).toFixed(2)}%`;
        }
      }
    }

    return { homework: hwRows[0], problems: problemRows, my_submission };
  },

  async submitHomework(
    homeworkId: number,
    studentId: number,
    answers: Record<string, string>,
  ) {
    const [existRows] = await pool.execute<RowDataPacket[]>(
      'SELECT submission_id FROM homework_submission WHERE homework_id = ? AND student_id = ? LIMIT 1',
      [homeworkId, studentId],
    );
    if (existRows.length > 0) throw new Error('已提交，不能重复提交');

    const [probRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_id, p.problem_content, p.standard_answer
       FROM homework_problem hp
       JOIN problem p ON p.problem_id = hp.problem_id
       WHERE hp.homework_id = ?
       ORDER BY hp.order_index`,
      [homeworkId],
    );
    if (probRows.length === 0) throw new Error('作业题目不存在');

    let correctCount = 0;
    const detail: Record<string, {
      answer_content: string;
      standard_answer: string;
      problem_content: string;
      is_correct: boolean;
    }> = {};

    for (const prob of probRows) {
      const studentAnswer = answers[String(prob.problem_id)] ?? '';
      const isCorrect =
        normalizeAnswer(studentAnswer) === normalizeAnswer(prob.standard_answer);
      if (isCorrect) correctCount++;
      detail[String(prob.problem_id)] = {
        answer_content: studentAnswer,
        problem_content: prob.problem_content,
        standard_answer: prob.standard_answer,
        is_correct:      isCorrect,
      };
    }

    const total       = probRows.length;
    const correctRate = parseFloat(((correctCount / total) * 100).toFixed(2));
    const score       = parseFloat(((correctCount / total) * 100).toFixed(2));

    await pool.execute<ResultSetHeader>(
      `INSERT INTO homework_submission
         (homework_id, student_id, score, correct_count, total, correct_rate, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [homeworkId, studentId, score, correctCount, total, correctRate, JSON.stringify(detail)],
    );

    return {
      score,
      correct_count: correctCount,
      total,
      correct_rate: `${correctRate.toFixed(2)}%`,
      detail,
    };
  },

  async getHomeworkCompletion(homeworkId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.student_id,
              s.name AS student_name,
              IF(sub.submission_id IS NOT NULL, TRUE, FALSE) AS is_submitted,
              sub.submitted_at,
              sub.score,
              sub.correct_count,
              sub.total,
              sub.correct_rate
       FROM homework_student hs
       JOIN student s ON s.student_id = hs.student_id
       LEFT JOIN homework_submission sub
              ON sub.homework_id = hs.homework_id AND sub.student_id = hs.student_id
       WHERE hs.homework_id = ?
       ORDER BY is_submitted DESC, s.name`,
      [homeworkId],
    );

    const submitted = rows.filter((r) => r.is_submitted).length;
    return { submitted, total: rows.length, list: rows };
  },
};

async function resolveAssignedStudentIds(
  teacherId: number,
  dto: CreateHomeworkDto,
): Promise<number[]> {
  const classIds = Array.isArray(dto.class_ids)
    ? dto.class_ids.map(Number).filter(Boolean)
    : [];

  if (dto.assign_all !== false) {
    let sql = `SELECT s.student_id
               FROM student s
               JOIN class c ON c.class_id = s.class_id
               WHERE s.account_status = 'active'
                 AND c.teacher_id = ?`;
    const params: (number | string)[] = [teacherId];
    if (classIds.length > 0) {
      sql += ` AND c.class_id IN (${classIds.map(() => '?').join(',')})`;
      params.push(...classIds);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map((row) => Number(row.student_id));
  }

  const studentIds = Array.isArray(dto.student_ids)
    ? dto.student_ids.map(Number).filter(Boolean)
    : [];
  if (studentIds.length === 0) return [];

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT s.student_id
     FROM student s
     JOIN class c ON c.class_id = s.class_id
     WHERE s.account_status = 'active'
       AND c.teacher_id = ?
       AND s.student_id IN (${studentIds.map(() => '?').join(',')})`,
    [teacherId, ...studentIds],
  );
  return rows.map((row) => Number(row.student_id));
}

// ── 辅助函数 ──────────────────────────────────────────────────

async function batchInsertProblems(raws: RawProblem[]): Promise<Problem[]> {
  const result: Problem[] = [];
  for (const raw of raws) {
    try {
      const [res] = await pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO problem
           (problem_content, problem_type, operation_type, difficulty_level,
            standard_answer, solution_steps, enable_status)
         VALUES (?, ?, ?, ?, ?, ?, 'enabled')`,
        [
          raw.problem_content,
          raw.problem_type,
          raw.operation_type,
          raw.difficulty_level,
          raw.standard_answer,
          raw.solution_steps,
        ],
      );
      if (res.insertId > 0) {
        result.push({
          problem_id:      res.insertId,
          ...raw,
          creator_id:      null,
          create_date:     new Date(),
          enable_status:   'enabled',
          usage_frequency: 0,
          error_index:     0,
        } as Problem);
      }
    } catch { /* duplicate, skip */ }
  }
  return result;
}

function shuffleAndSlice<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

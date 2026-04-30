import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { OperationType, Problem } from '../types';
import {
  generateProblems as dynGenerate,
  normalizeAnswer,
  RawProblem,
} from '../utils/problem-generator';

export interface CreateExamPaperDto {
  title: string;
  operation_type: string;
  difficulty_level: number;
  problem_count: number;
}

export interface CreateExamDto {
  paper_id: number;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  assign_all?: boolean;
  student_ids?: number[];
  class_ids?: number[];
}

export interface SubmitExamDto {
  answers: Array<{
    problem_id: number;
    answer_content: string;
    answer_time_seconds?: number;
  }>;
}

export const examService = {
  async createExamPaper(teacherId: number, dto: CreateExamPaperDto) {
    const level = Math.min(10, Math.max(1, Number(dto.difficulty_level) || 1));
    const count = Math.min(100, Math.max(1, Number(dto.problem_count) || 10));
    const operationType = dto.operation_type || 'addition';

    const selected = await pickProblems(level, count, operationType);
    if (selected.length === 0) throw new Error('题库暂无可用题目，请调整难度或题型');

    const [paperRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exam_paper (teacher_id, title, problem_count, difficulty_level, operation_type)
       VALUES (?, ?, ?, ?, ?)`,
      [teacherId, dto.title, selected.length, level, operationType],
    );
    const paperId = paperRes.insertId;

    for (let i = 0; i < selected.length; i++) {
      await pool.execute(
        `INSERT INTO exam_paper_problem (paper_id, problem_id, score, order_index)
         VALUES (?, ?, ?, ?)`,
        [paperId, selected[i].problem_id, 2, i],
      );
    }

    return {
      paper_id: paperId,
      title: dto.title,
      problem_count: selected.length,
      difficulty_level: level,
      operation_type: operationType,
      problems: selected,
    };
  },

  async getExamPaperDetail(paperId: number, teacherId?: number) {
    const args: number[] = [paperId];
    let ownerSql = '';
    if (teacherId) {
      ownerSql = ' AND teacher_id = ?';
      args.push(teacherId);
    }

    const [paperRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM exam_paper WHERE paper_id = ?${ownerSql} LIMIT 1`,
      args,
    );
    if (paperRows.length === 0) throw new Error('试卷不存在');

    const [problemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_id, p.problem_content, p.problem_type, p.difficulty_level,
              p.standard_answer, epp.score, epp.order_index
       FROM exam_paper_problem epp
       JOIN problem p ON p.problem_id = epp.problem_id
       WHERE epp.paper_id = ?
       ORDER BY epp.order_index`,
      [paperId],
    );

    return { ...paperRows[0], problems: problemRows };
  },

  async createExam(teacherId: number, dto: CreateExamDto): Promise<{ exam_id: number }> {
    const [paperRows] = await pool.execute<RowDataPacket[]>(
      `SELECT paper_id, problem_count
       FROM exam_paper
       WHERE paper_id = ? AND teacher_id = ?
       LIMIT 1`,
      [dto.paper_id, teacherId],
    );
    if (paperRows.length === 0) throw new Error('试卷不存在');

    const [scoreRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(SUM(score), 0) AS total_score FROM exam_paper_problem WHERE paper_id = ?',
      [dto.paper_id],
    );
    const totalScore = Number(scoreRows[0]?.total_score ?? 0);

    const [examRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exam
         (paper_id, teacher_id, title, start_time, end_time, duration_minutes,
          status, problem_count, total_score)
       VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
      [
        dto.paper_id,
        teacherId,
        dto.title,
        dto.start_time,
        dto.end_time,
        Math.max(1, Number(dto.duration_minutes) || 30),
        Number(paperRows[0].problem_count ?? 0),
        totalScore,
      ],
    );
    const examId = examRes.insertId;

    const assignedStudentIds = await resolveExamStudentIds(teacherId, dto);
    for (const studentId of assignedStudentIds) {
      await pool.execute(
        'INSERT IGNORE INTO exam_student (exam_id, student_id) VALUES (?, ?)',
        [examId, studentId],
      );
    }

    return { exam_id: examId };
  },

  async getTeacherExamList(
    teacherId: number,
    page: number,
    pageSize: number,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safeSize;
    const args: (number | string)[] = [teacherId];
    let whereSql = 'WHERE e.teacher_id = ?';
    if (status) {
      whereSql += ' AND e.status = ?';
      args.push(status);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM exam e ${whereSql}`,
      args,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT e.*,
              COUNT(DISTINCT es.student_id) AS total_assigned,
              COUNT(DISTINCT sub.student_id) AS submitted_count
       FROM exam e
       LEFT JOIN exam_student es ON es.exam_id = e.exam_id
       LEFT JOIN exam_submission sub ON sub.exam_id = e.exam_id
       ${whereSql}
       GROUP BY e.exam_id
       ORDER BY e.start_time DESC, e.exam_id DESC
       LIMIT ${safeSize} OFFSET ${offset}`,
      args,
    );

    return { list: rows, total: Number(countRows[0]?.total ?? 0) };
  },

  async getStudentExamList(
    studentId: number,
    page: number,
    pageSize: number,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safeSize;
    const args: (number | string)[] = [studentId];
    let whereSql = 'WHERE es.student_id = ?';
    if (status === 'not_started' || status === 'pending') {
      whereSql += ' AND sub.submission_id IS NULL';
    } else if (status === 'submitted') {
      whereSql += ' AND sub.submission_id IS NOT NULL';
    } else if (status) {
      whereSql += ' AND e.status = ?';
      args.push(status);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM exam_student es
       JOIN exam e ON e.exam_id = es.exam_id
       LEFT JOIN exam_submission sub
              ON sub.exam_id = e.exam_id AND sub.student_id = es.student_id
       ${whereSql}`,
      args,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT e.*,
              IF(sub.submission_id IS NOT NULL, 'submitted', 'pending') AS my_status,
              sub.score AS my_score,
              sub.correct_rate AS my_correct_rate
       FROM exam_student es
       JOIN exam e ON e.exam_id = es.exam_id
       LEFT JOIN exam_submission sub
              ON sub.exam_id = e.exam_id AND sub.student_id = es.student_id
       ${whereSql}
       ORDER BY e.start_time ASC, e.exam_id DESC
       LIMIT ${safeSize} OFFSET ${offset}`,
      args,
    );

    return { list: rows, total: Number(countRows[0]?.total ?? 0) };
  },

  async getExamDetail(examId: number, studentId?: number) {
    const [examRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM exam WHERE exam_id = ? LIMIT 1',
      [examId],
    );
    if (examRows.length === 0) throw new Error('考试不存在');
    const exam = examRows[0];

    const [problemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_id, p.problem_content, p.problem_type, p.difficulty_level,
              p.standard_answer, epp.score, epp.order_index
       FROM exam_paper_problem epp
       JOIN problem p ON p.problem_id = epp.problem_id
       WHERE epp.paper_id = ?
       ORDER BY epp.order_index`,
      [exam.paper_id],
    );

    let myResult: RowDataPacket | null = null;
    if (studentId) {
      const [resultRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM exam_submission WHERE exam_id = ? AND student_id = ? LIMIT 1',
        [examId, studentId],
      );
      if (resultRows.length > 0) {
        myResult = { ...resultRows[0] };
        if (typeof myResult.detail === 'string') {
          try { myResult.detail = JSON.parse(myResult.detail); } catch { /* noop */ }
        }
        if (myResult.correct_rate !== null && myResult.correct_rate !== undefined) {
          myResult.correct_rate = `${parseFloat(myResult.correct_rate).toFixed(2)}%`;
        }
      }
    }

    return { exam, problems: problemRows, my_result: myResult };
  },

  async submitExam(examId: number, studentId: number, dto: SubmitExamDto) {
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM exam_student WHERE exam_id = ? AND student_id = ? LIMIT 1',
      [examId, studentId],
    );
    if (assignRows.length === 0) throw new Error('未分配该考试');

    const [existRows] = await pool.execute<RowDataPacket[]>(
      'SELECT submission_id FROM exam_submission WHERE exam_id = ? AND student_id = ? LIMIT 1',
      [examId, studentId],
    );
    if (existRows.length > 0) throw new Error('已提交，不能重复提交');

    const [examRows] = await pool.execute<RowDataPacket[]>(
      'SELECT paper_id, total_score FROM exam WHERE exam_id = ? LIMIT 1',
      [examId],
    );
    if (examRows.length === 0) throw new Error('考试不存在');

    const [problemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.problem_id, p.problem_content, p.standard_answer, epp.score
       FROM exam_paper_problem epp
       JOIN problem p ON p.problem_id = epp.problem_id
       WHERE epp.paper_id = ?
       ORDER BY epp.order_index`,
      [examRows[0].paper_id],
    );
    if (problemRows.length === 0) throw new Error('考试题目不存在');

    const answerMap = new Map<number, string>();
    for (const item of dto.answers ?? []) {
      answerMap.set(Number(item.problem_id), item.answer_content ?? '');
    }

    let correctCount = 0;
    let score = 0;
    const detail = problemRows.map((problem) => {
      const studentAnswer = answerMap.get(Number(problem.problem_id)) ?? '';
      const isCorrect =
        normalizeAnswer(studentAnswer) === normalizeAnswer(problem.standard_answer);
      if (isCorrect) {
        correctCount++;
        score += Number(problem.score ?? 0);
      }
      return {
        problem_id: problem.problem_id,
        problem_content: problem.problem_content,
        student_answer: studentAnswer,
        standard_answer: problem.standard_answer,
        score: Number(problem.score ?? 0),
        is_correct: isCorrect,
      };
    });

    const totalCount = problemRows.length;
    const totalScore = Number(examRows[0].total_score ?? 0);
    const correctRate = parseFloat(((correctCount / totalCount) * 100).toFixed(2));

    await pool.execute<ResultSetHeader>(
      `INSERT INTO exam_submission
         (exam_id, student_id, score, total_score, correct_count, total_count,
          correct_rate, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        examId,
        studentId,
        score,
        totalScore,
        correctCount,
        totalCount,
        correctRate,
        JSON.stringify(detail),
      ],
    );

    return {
      score,
      total_score: totalScore,
      correct_count: correctCount,
      total_count: totalCount,
      correct_rate: `${correctRate.toFixed(2)}%`,
    };
  },

  async getExamResult(examId: number, studentId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM exam_submission WHERE exam_id = ? AND student_id = ? LIMIT 1',
      [examId, studentId],
    );
    if (rows.length === 0) throw new Error('暂无考试结果');
    const result = { ...rows[0] };
    if (typeof result.detail === 'string') {
      try { result.detail = JSON.parse(result.detail); } catch { /* noop */ }
    }
    if (result.correct_rate !== null && result.correct_rate !== undefined) {
      result.correct_rate = `${parseFloat(result.correct_rate).toFixed(2)}%`;
    }
    return result;
  },

  async getExamStats(examId: number, teacherId: number) {
    const [examRows] = await pool.execute<RowDataPacket[]>(
      'SELECT exam_id FROM exam WHERE exam_id = ? AND teacher_id = ? LIMIT 1',
      [examId, teacherId],
    );
    if (examRows.length === 0) throw new Error('考试不存在');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.student_id, s.name,
              sub.score, sub.total_score, sub.correct_count, sub.total_count,
              sub.correct_rate, sub.submitted_at
       FROM exam_student es
       JOIN student s ON s.student_id = es.student_id
       LEFT JOIN exam_submission sub
              ON sub.exam_id = es.exam_id AND sub.student_id = es.student_id
       WHERE es.exam_id = ?
       ORDER BY sub.score DESC, s.name`,
      [examId],
    );

    const submittedRows = rows.filter((row) => row.submitted_at);
    const submitted = submittedRows.length;
    const total = rows.length;
    const avgScore = submitted
      ? parseFloat((submittedRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / submitted).toFixed(2))
      : 0;
    const avgRate = submitted
      ? parseFloat((submittedRows.reduce((sum, row) => sum + Number(row.correct_rate ?? 0), 0) / submitted).toFixed(2))
      : 0;

    return {
      total,
      submitted,
      avg_score: avgScore,
      avg_rate: `${avgRate.toFixed(2)}%`,
      score_dist: buildScoreDist(submittedRows),
      student_scores: rows.map((row) => ({
        student_id: row.student_id,
        name: row.name,
        score: Number(row.score ?? 0),
        total_score: Number(row.total_score ?? 0),
        correct_count: Number(row.correct_count ?? 0),
        total_count: Number(row.total_count ?? 0),
        correct_rate: row.correct_rate !== null && row.correct_rate !== undefined
          ? `${parseFloat(row.correct_rate).toFixed(2)}%`
          : '-',
        submitted_at: row.submitted_at ?? null,
      })),
    };
  },
};

async function resolveExamStudentIds(
  teacherId: number,
  dto: CreateExamDto,
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

async function pickProblems(
  level: number,
  count: number,
  operationType: string,
): Promise<Problem[]> {
  let sql = `SELECT * FROM problem WHERE enable_status = 'enabled' AND difficulty_level = ?`;
  const params: (string | number)[] = [level];
  if (operationType) {
    sql += ' AND problem_type = ?';
    params.push(operationType);
  }
  sql += ` LIMIT ${count * 3}`;

  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  let problems = rows as Problem[];

  if (problems.length < count) {
    const raws = dynGenerate(
      level,
      count - problems.length + 10,
      operationType as OperationType | undefined,
    );
    const inserted = await batchInsertProblems(raws);
    problems = [...problems, ...inserted];
  }

  return shuffleAndSlice(problems, count);
}

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
          problem_id: res.insertId,
          ...raw,
          creator_id: null,
          create_date: new Date(),
          enable_status: 'enabled',
          usage_frequency: 0,
          error_index: 0,
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

function buildScoreDist(rows: RowDataPacket[]) {
  const buckets = [
    { range: '90-100', min: 90, max: 100, count: 0 },
    { range: '80-89', min: 80, max: 89.999, count: 0 },
    { range: '60-79', min: 60, max: 79.999, count: 0 },
    { range: '0-59', min: 0, max: 59.999, count: 0 },
  ];

  for (const row of rows) {
    const totalScore = Number(row.total_score ?? 0);
    const score = Number(row.score ?? 0);
    const percent = totalScore > 0 ? (score / totalScore) * 100 : 0;
    const bucket = buckets.find((item) => percent >= item.min && percent <= item.max);
    if (bucket) bucket.count++;
  }

  return buckets.map(({ range, count }) => ({ range, count }));
}

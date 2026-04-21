/**
 * 文件说明：题目 service（完整版）
 * 系统作用：
 *   1. generateProblems  — 优先从 DB 取题，不足时动态生成并写入 DB，Redis 缓存5分钟
 *   2. submitAnswer      — 判题 → 写训练记录 → 更新错题本 → 更新等级 → 更新日统计
 *   3. getProblemById    — 按 ID 查单题（含解题步骤）
 *
 * 调用链：
 *   controller → problemService.generateProblems
 *             → generator.generateProblems (动态生成)
 *             → pool.execute INSERT problem   (入库)
 *             → redisService.setCache         (缓存)
 *
 *   controller → problemService.submitAnswer
 *             → pool.execute SELECT problem   (查答案)
 *             → normalizeAnswer               (标准化比较)
 *             → pool.execute INSERT training_record
 *             → upsertMistake / markCorrected
 *             → updateStudentLevel            (升降级)
 *             → statsService.upsertDailyStat  (每日统计)
 */
import { pool } from '../config/database';
import { redisService } from './redis.service';
import { statsService } from './stats.service';
import {
  generateProblems as dynGenerate,
  normalizeAnswer,
  RawProblem,
} from '../utils/problem-generator';
import {
  Problem,
  GenerateProblemDto,
  SubmitAnswerDto,
  OperationType,
} from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

// ── 返回类型定义 ──────────────────────────────────────────────

export interface SubmitResult {
  is_correct: boolean;
  standard_answer: string;
  score: number;
  problem_content: string;
  solution_steps: string | null;
  record_id: number;
  level_changed: boolean;
  new_level: number;
  recent_20_correct_rate: number;
}

export interface ProblemWithId extends RawProblem {
  problem_id: number;
}

// ── 主 service ────────────────────────────────────────────────

export const problemService = {

  /**
   * 出题：先从 DB 取，不足则动态生成并持久化入库
   * 支持按 difficulty_level 和 operation_type 筛选
   * 题目池缓存到 Redis，TTL 5 分钟
   */
  async generateProblems(dto: GenerateProblemDto): Promise<Problem[]> {
    const level = Math.min(10, Math.max(1, dto.difficulty_level ?? 1));
    const count = Math.min(20, Math.max(1, dto.count ?? 10));
    const cacheKey = `problems:level:${level}:type:${dto.operation_type ?? 'all'}`;

    // ① 尝试 Redis 缓存
    const cached = await redisService.getCache<Problem[]>(cacheKey);
    if (cached && cached.length >= count) {
      return shuffleAndSlice(cached, count);
    }

    // ② 从 DB 取题（最多 50 条作为题目池）
    let sql = `SELECT * FROM problem
               WHERE enable_status = 'enabled' AND difficulty_level = ?`;
    const params: (string | number)[] = [level];

    if (dto.operation_type) {
      sql += ' AND problem_type = ?';
      params.push(dto.operation_type);
    }
    sql += ' LIMIT 50';

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    let problems = rows as Problem[];

    // ③ DB 题目不足时，动态生成补充并持久化
    if (problems.length < count) {
      const needed = count - problems.length + 10; // 多生成几道作为储备
      const raw = dynGenerate(level, needed, dto.operation_type as OperationType | undefined);
      const inserted = await batchInsertProblems(raw);
      problems = [...problems, ...inserted];
    }

    // ④ 写入 Redis 缓存
    await redisService.setCache(cacheKey, problems, 300);

    return shuffleAndSlice(problems, count);
  },

  /**
   * 判题：标准化比对答案，写训练记录，维护错题本，触发等级+统计更新
   */
  async submitAnswer(studentId: number, dto: SubmitAnswerDto): Promise<SubmitResult> {
    // ① 取题目
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM problem WHERE problem_id = ? AND enable_status = 'enabled' LIMIT 1`,
      [dto.problem_id]
    );
    if (rows.length === 0) throw new Error('题目不存在或已下架');
    const problem = rows[0] as Problem;

    // ② 标准化判题（支持 "5" == "5.0" == "5.00"）
    const isCorrect =
      normalizeAnswer(dto.answer_content) === normalizeAnswer(problem.standard_answer);
    const score = isCorrect ? 10 : 0;
    const sessionId = dto.session_id ?? uuidv4();

    // ③ 写训练记录
    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO training_record
         (student_id, problem_id, answer_content, is_correct, answer_time_seconds,
          answer_date, score, is_review, session_id)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        studentId,
        dto.problem_id,
        dto.answer_content,
        isCorrect,
        dto.answer_time_seconds,
        score,
        dto.is_review ?? false,
        sessionId,
      ]
    );

    // ④ 更新题目使用频率
    await pool.execute(
      'UPDATE problem SET usage_frequency = usage_frequency + 1 WHERE problem_id = ?',
      [dto.problem_id]
    );

    // ⑤ 错题本维护
    if (!isCorrect) {
      await upsertMistake(studentId, problem, dto.answer_content);
    } else {
      // 答对 → 若在错题本中，自动标记为已改正
      await pool.execute(
        `UPDATE mistake_book
         SET is_corrected = TRUE, corrected_date = NOW()
         WHERE student_id = ? AND problem_id = ? AND is_corrected = FALSE`,
        [studentId, dto.problem_id]
      );
    }

    // ⑥ 等级评估（升降级 + 累计统计）
    const { newLevel, rate } = await updateStudentLevel(studentId);

    // ⑦ 更新今日学习统计
    await statsService.upsertDailyStat(studentId);

    // ⑧ 获取当前等级（用于判断是否发生变化）
    const [prevLvRows] = await pool.execute<RowDataPacket[]>(
      'SELECT current_level FROM student WHERE student_id = ?',
      [studentId]
    );
    const prevLevel = prevLvRows.length > 0 ? prevLvRows[0].current_level : 1;

    return {
      is_correct: isCorrect,
      standard_answer: problem.standard_answer,
      score,
      problem_content: problem.problem_content,
      solution_steps: problem.solution_steps,
      record_id: insertResult.insertId,
      level_changed: newLevel !== prevLevel,
      new_level: newLevel,
      recent_20_correct_rate: rate,
    };
  },

  /**
   * 按 ID 查单题（含解题步骤，用于错题本展示）
   */
  async getProblemById(problemId: number): Promise<Problem | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM problem WHERE problem_id = ? LIMIT 1',
      [problemId]
    );
    return rows.length > 0 ? (rows[0] as Problem) : null;
  },
};

// ── 内部辅助函数 ──────────────────────────────────────────────

/**
 * 批量写入动态生成的题目，返回含 problem_id 的题目列表
 */
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
        ]
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
    } catch {
      // 重复题目静默跳过（IGNORE 策略）
    }
  }
  return result;
}

/**
 * 答错时 upsert mistake_book，同时更新题目错误指数
 */
async function upsertMistake(
  studentId: number,
  problem: Problem,
  studentAnswer: string
): Promise<void> {
  // 用 INSERT ... ON DUPLICATE KEY UPDATE 替代先查后写，减少一次 DB 往返
  await pool.execute(
    `INSERT INTO mistake_book
       (student_id, problem_id, standard_answer, student_answer,
        first_wrong_date, last_wrong_date, wrong_count, is_corrected)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 1, FALSE)
     ON DUPLICATE KEY UPDATE
       wrong_count    = wrong_count + 1,
       last_wrong_date = NOW(),
       is_corrected   = FALSE`,
    [studentId, problem.problem_id, problem.standard_answer, studentAnswer]
  );

  // 重新计算错误指数：错误次数 / 使用次数 * 100
  await pool.execute(
    `UPDATE problem p
     SET p.error_index = (
       SELECT ROUND(
         SUM(CASE WHEN tr.is_correct = FALSE THEN 1 ELSE 0 END) * 100.0
         / NULLIF(p.usage_frequency, 0)
       , 2)
       FROM training_record tr
       WHERE tr.problem_id = p.problem_id
     )
     WHERE p.problem_id = ?`,
    [problem.problem_id]
  );
}

/**
 * 评估最近20题正确率，自动升降级，更新 student 累计统计
 * 返回新等级和正确率（用于响应前端）
 */
async function updateStudentLevel(
  studentId: number
): Promise<{ newLevel: number; rate: number }> {
  // 取最近20条（不区分是否复习，统一计入）
  const [recent] = await pool.execute<RowDataPacket[]>(
    `SELECT is_correct FROM training_record
     WHERE student_id = ? ORDER BY created_time DESC LIMIT 20`,
    [studentId]
  );
  const total = recent.length;
  if (total === 0) return { newLevel: 1, rate: 0 };

  const correct = recent.filter((r: RowDataPacket) => Boolean(r.is_correct)).length;
  const rate = parseFloat(((correct / total) * 100).toFixed(2));
  const qualified = rate >= 85;

  // 更新 student_level
  await pool.execute(
    `INSERT INTO student_level
       (student_id, current_level, correct_problems, wrong_problems,
        recent_20_correct_rate, is_promotion_qualified)
     VALUES (?, 1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       correct_problems        = VALUES(correct_problems),
       wrong_problems          = VALUES(wrong_problems),
       recent_20_correct_rate  = VALUES(recent_20_correct_rate),
       is_promotion_qualified  = VALUES(is_promotion_qualified)`,
    [studentId, correct, total - correct, rate, qualified]
  );

  // 查现有等级
  const [lvRows] = await pool.execute<RowDataPacket[]>(
    'SELECT current_level FROM student_level WHERE student_id = ?',
    [studentId]
  );
  let level: number = lvRows.length > 0 ? lvRows[0].current_level : 1;

  // 升级：正确率 ≥ 85%，且已有 20 条记录才触发
  if (total === 20 && rate >= 85 && level < 10) {
    level += 1;
    await pool.execute(
      `UPDATE student_level
       SET current_level = ?, promotion_date = NOW()
       WHERE student_id = ?`,
      [level, studentId]
    );
  } else if (total === 20 && rate < 60 && level > 1) {
    // 降级：正确率 < 60%
    level -= 1;
    await pool.execute(
      `UPDATE student_level
       SET current_level = ?, promotion_date = NOW()
       WHERE student_id = ?`,
      [level, studentId]
    );
  }

  // 同步 student 表冗余字段
  await pool.execute(
    `UPDATE student
     SET current_level        = ?,
         total_problems        = (SELECT COUNT(*)
                                  FROM training_record WHERE student_id = ?),
         cumulative_correct_rate = (
           SELECT ROUND(
             SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
           )
           FROM training_record WHERE student_id = ?
         )
     WHERE student_id = ?`,
    [level, studentId, studentId, studentId]
  );

  return { newLevel: level, rate };
}

function shuffleAndSlice<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

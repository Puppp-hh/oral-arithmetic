/**
 * 文件说明：学习统计 service（完整版）
 * 系统作用：
 *   1. getSummary       — 学生总览（题数/正确率/等级/最近20题）
 *   2. getDailyStats    — 按天统计列表（近 N 天）
 *   3. getRecent20      — 最近20题详情
 *   4. upsertDailyStat  — 每次答题后自动更新今日 learning_statistic（被 problemService 调用）
 *
 * 调用链：
 *   statsController      → statsService.getSummary / getDailyStats / getRecent20
 *   problemService       → statsService.upsertDailyStat（答题后自动触发）
 *   → pool.execute → learning_statistic / student / student_level
 */
import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";
import { redisService, CacheKeys, CacheTTL } from "./redis.service";

// ── 返回类型 ──────────────────────────────────────────────────

export interface Summary {
  student_name: string;
  total_problems: number;
  cumulative_correct_rate: number;
  current_level: number;
  recent_20_correct_rate: number;
  is_promotion_qualified: boolean;
  today_problems: number;
  today_correct_rate: number;
}

export interface DailyStatRow {
  statistic_date: string;
  daily_problems: number;
  daily_correct: number;
  daily_wrong: number;
  daily_correct_rate: number;
  daily_avg_time: number;
  addition_correct_rate: number;
  subtraction_correct_rate: number;
  multiplication_correct_rate: number;
  division_correct_rate: number;
  mixed_operation_correct_rate: number;
}

export interface Recent20Result {
  total: number;
  correct: number;
  wrong: number;
  correct_rate: number;
  records: Array<{
    problem_content: string;
    problem_type: string;
    is_correct: boolean;
    answer_content: string;
    standard_answer: string;
    answer_time_seconds: number;
    answer_date: Date;
  }>;
}

// ── service ───────────────────────────────────────────────────

export const statsService = {
  // ── 总览摘要 ─────────────────────────────────────────────
  /**
   * 缓存策略：stats:summary:{studentId} TTL=60s
   * 答题后由 upsertDailyStat 主动 deleteCache，保证数据近实时
   * 调用链：controller → getSummary → Redis hit → 返回 / miss → 3次 DB 查询 → 回写 Redis
   */
  async getSummary(studentId: number): Promise<Summary> {
    const cacheKey = CacheKeys.statsSummary(studentId);

    // ① 尝试 Redis 缓存（60s 内的摘要直接返回）
    const cached = await redisService.getCache<Summary>(cacheKey);
    if (cached) return cached;

    // ② 缓存未命中，聚合 DB 数据
    const [studentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT name, total_problems, cumulative_correct_rate, current_level
       FROM student WHERE student_id = ?`,
      [studentId],
    );
    if (studentRows.length === 0) throw new Error("学生不存在");
    const s = studentRows[0];

    const [levelRows] = await pool.execute<RowDataPacket[]>(
      `SELECT recent_20_correct_rate, is_promotion_qualified
       FROM student_level WHERE student_id = ?`,
      [studentId],
    );
    const lvl = levelRows[0] ?? {
      recent_20_correct_rate: 0,
      is_promotion_qualified: false,
    };

    const [todayRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS daily_problems,
         ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
           AS today_correct_rate
       FROM training_record
       WHERE student_id = ? AND DATE(answer_date) = CURDATE()`,
      [studentId],
    );
    const today = todayRows[0];

    const summary: Summary = {
      student_name: s.name,
      total_problems: s.total_problems,
      cumulative_correct_rate: parseFloat(s.cumulative_correct_rate) || 0,
      current_level: s.current_level,
      recent_20_correct_rate: parseFloat(lvl.recent_20_correct_rate) || 0,
      is_promotion_qualified: Boolean(lvl.is_promotion_qualified),
      today_problems: today.daily_problems || 0,
      today_correct_rate: parseFloat(today.today_correct_rate) || 0,
    };

    // ③ 回写缓存（TTL=60s）
    await redisService.setCache(cacheKey, summary, CacheTTL.STATS_SUMMARY);

    return summary;
  },

  // ── 每日统计列表 ─────────────────────────────────────────
  async getDailyStats(
    studentId: number,
    days: number,
  ): Promise<DailyStatRow[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         DATE_FORMAT(statistic_date, '%Y-%m-%d') as statistic_date,
         daily_problems,
         daily_correct,
         daily_wrong,
         daily_correct_rate,
         daily_avg_time,
         addition_correct_rate,
         subtraction_correct_rate,
         multiplication_correct_rate,
         division_correct_rate,
         mixed_operation_correct_rate
       FROM learning_statistic
       WHERE student_id = ?
         AND statistic_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY statistic_date DESC`,
      [studentId, days],
    );
    return rows as DailyStatRow[];
  },

  // ── 最近20题详情 ─────────────────────────────────────────
  async getRecent20(studentId: number): Promise<Recent20Result> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         tr.is_correct,
         tr.answer_content,
         tr.answer_time_seconds,
         tr.answer_date,
         p.problem_content,
         p.problem_type,
         p.standard_answer
       FROM training_record tr
       JOIN problem p ON tr.problem_id = p.problem_id
       WHERE tr.student_id = ?
       ORDER BY tr.created_time DESC
       LIMIT 20`,
      [studentId],
    );

    const total = rows.length;
    const correct = rows.filter((r) => Boolean(r.is_correct)).length;

    return {
      total,
      correct,
      wrong: total - correct,
      correct_rate:
        total > 0 ? parseFloat(((correct / total) * 100).toFixed(2)) : 0,
      records: rows as Recent20Result["records"],
    };
  },

  // ── 每日统计 UPSERT（每次答题后自动调用）────────────────
  async upsertDailyStat(studentId: number): Promise<void> {
    // 从 training_record 聚合今日数据
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS daily_problems,
         SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS daily_correct,
         SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS daily_wrong,
         ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
           AS daily_correct_rate,
         ROUND(AVG(answer_time_seconds), 2) AS daily_avg_time,

         -- 各类型正确率
         ROUND(
           SUM(CASE WHEN p.problem_type='addition' AND tr.is_correct THEN 1 ELSE 0 END) * 100.0
           / NULLIF(SUM(CASE WHEN p.problem_type='addition' THEN 1 ELSE 0 END), 0)
         , 2) AS addition_correct_rate,

         ROUND(
           SUM(CASE WHEN p.problem_type='subtraction' AND tr.is_correct THEN 1 ELSE 0 END) * 100.0
           / NULLIF(SUM(CASE WHEN p.problem_type='subtraction' THEN 1 ELSE 0 END), 0)
         , 2) AS subtraction_correct_rate,

         ROUND(
           SUM(CASE WHEN p.problem_type='multiplication' AND tr.is_correct THEN 1 ELSE 0 END) * 100.0
           / NULLIF(SUM(CASE WHEN p.problem_type='multiplication' THEN 1 ELSE 0 END), 0)
         , 2) AS multiplication_correct_rate,

         ROUND(
           SUM(CASE WHEN p.problem_type='division' AND tr.is_correct THEN 1 ELSE 0 END) * 100.0
           / NULLIF(SUM(CASE WHEN p.problem_type='division' THEN 1 ELSE 0 END), 0)
         , 2) AS division_correct_rate,

         ROUND(
           SUM(CASE WHEN p.problem_type='mixed' AND tr.is_correct THEN 1 ELSE 0 END) * 100.0
           / NULLIF(SUM(CASE WHEN p.problem_type='mixed' THEN 1 ELSE 0 END), 0)
         , 2) AS mixed_operation_correct_rate

       FROM training_record tr
       JOIN problem p ON tr.problem_id = p.problem_id
       WHERE tr.student_id = ? AND DATE(tr.answer_date) = CURDATE()`,
      [studentId],
    );

    if (rows.length === 0 || rows[0].daily_problems === 0) return;
    const d = rows[0];

    // 主动删除摘要缓存，保证下次 getSummary 取到最新数据
    await redisService.deleteCache(CacheKeys.statsSummary(studentId));

    await pool.execute(
      `INSERT INTO learning_statistic
         (student_id, statistic_date, daily_problems, daily_correct, daily_wrong,
          daily_correct_rate, daily_avg_time,
          addition_correct_rate, subtraction_correct_rate,
          multiplication_correct_rate, division_correct_rate,
          mixed_operation_correct_rate)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         daily_problems              = VALUES(daily_problems),
         daily_correct               = VALUES(daily_correct),
         daily_wrong                 = VALUES(daily_wrong),
         daily_correct_rate          = VALUES(daily_correct_rate),
         daily_avg_time              = VALUES(daily_avg_time),
         addition_correct_rate       = VALUES(addition_correct_rate),
         subtraction_correct_rate    = VALUES(subtraction_correct_rate),
         multiplication_correct_rate = VALUES(multiplication_correct_rate),
         division_correct_rate       = VALUES(division_correct_rate),
         mixed_operation_correct_rate= VALUES(mixed_operation_correct_rate)`,
      [
        studentId,
        d.daily_problems,
        d.daily_correct,
        d.daily_wrong,
        d.daily_correct_rate ?? 0,
        d.daily_avg_time ?? 0,
        d.addition_correct_rate ?? 0,
        d.subtraction_correct_rate ?? 0,
        d.multiplication_correct_rate ?? 0,
        d.division_correct_rate ?? 0,
        d.mixed_operation_correct_rate ?? 0,
      ],
    );
  },
};

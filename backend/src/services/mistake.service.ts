/**
 * 文件说明：错题本 service
 * 系统作用：查询、删除、标记改正 mistake_book 表
 * 调用链：mistakeController → mistakeService → pool.execute → mistake_book
 */
import { pool } from '../config/database';
import { MistakeBook } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface MistakeWithProblem extends MistakeBook {
  problem_content: string;
  problem_type: string;
  difficulty_level: number;
  solution_steps: string | null;
}

interface PagedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const mistakeService = {
  async getMistakes(
    studentId: number,
    page: number,
    pageSize: number,
    isCorrected?: boolean
  ): Promise<PagedResult<MistakeWithProblem>> {
    const offset = (page - 1) * pageSize;
    let whereExtra = '';
    const params: (number | boolean)[] = [studentId];

    if (isCorrected !== undefined) {
      whereExtra = ' AND mb.is_corrected = ?';
      params.push(isCorrected);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM mistake_book mb WHERE mb.student_id = ?${whereExtra}`,
      params
    );
    const total: number = countRows[0].total;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mb.*, p.problem_content, p.problem_type, p.difficulty_level, p.solution_steps
       FROM mistake_book mb
       JOIN problem p ON mb.problem_id = p.problem_id
       WHERE mb.student_id = ?${whereExtra}
       ORDER BY mb.last_wrong_date DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return { list: rows as MistakeWithProblem[], total, page, pageSize };
  },

  async deleteMistake(studentId: number, mistakeId: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM mistake_book WHERE mistake_id = ? AND student_id = ?',
      [mistakeId, studentId]
    );
    if (result.affectedRows === 0) throw new Error('错题不存在或无权限删除');
  },

  async markCorrected(studentId: number, mistakeId: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE mistake_book SET is_corrected = TRUE, corrected_date = NOW()
       WHERE mistake_id = ? AND student_id = ?`,
      [mistakeId, studentId]
    );
    if (result.affectedRows === 0) throw new Error('错题不存在或无权限操作');
  },
};

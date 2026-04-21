/**
 * 文件说明：全局 TypeScript 接口定义
 * 系统作用：严格映射 database.md 所有表结构，供 service/controller 使用
 * 调用链：所有层均 import { Student, Problem, ... } from '../types'
 */

// ── JWT payload ──────────────────────────────────────────────
export interface JwtPayload {
  userId: number;
  account: string;
  role: 'student' | 'teacher';
  iat?: number;
  exp?: number;
}

// ── 年级表 grade ─────────────────────────────────────────────
export interface Grade {
  grade_id: number;
  grade_name: string;
  class_count: number;
  student_count: number;
}

// ── 班级表 class ─────────────────────────────────────────────
export interface Class {
  class_id: number;
  grade_id: number;
  class_name: string;
  teacher_id: number | null;
  student_count: number;
  created_date: Date;
  class_status: 'active' | 'inactive';
  avg_level: number;
  avg_correct_rate: number;
}

// ── 学生表 student ────────────────────────────────────────────
export interface Student {
  student_id: number;
  account: string;
  password: string;
  name: string;
  class_id: number;
  grade_id: number;
  gender: 'male' | 'female' | 'unknown';
  birth_date: Date | null;
  register_date: Date;
  last_login_time: Date | null;
  current_level: number;
  total_problems: number;
  cumulative_correct_rate: number;
  account_status: 'active' | 'inactive' | 'banned';
}

export type StudentPublic = Omit<Student, 'password'>;

// ── 教师表 teacher ────────────────────────────────────────────
export interface Teacher {
  teacher_id: number;
  name: string;
  account: string;
  password: string;
  email: string | null;
  phone: string | null;
  teaching_subjects: string | null;
  created_date: Date;
  account_status: 'active' | 'inactive' | 'banned';
}

export type TeacherPublic = Omit<Teacher, 'password'>;

// ── 题库表 problem ────────────────────────────────────────────
export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';

export interface Problem {
  problem_id: number;
  problem_content: string;
  problem_type: OperationType;
  operation_type: string | null;
  difficulty_level: number;
  standard_answer: string;
  solution_steps: string | null;
  creator_id: number | null;
  create_date: Date;
  enable_status: 'enabled' | 'disabled';
  usage_frequency: number;
  error_index: number;
}

// ── 训练记录表 training_record ────────────────────────────────
export interface TrainingRecord {
  record_id: number;
  student_id: number;
  problem_id: number;
  answer_content: string;
  is_correct: boolean;
  answer_time_seconds: number;
  answer_date: Date;
  score: number;
  is_review: boolean;
  session_id: string | null;
  created_time: Date;
}

// ── 错题库表 mistake_book ─────────────────────────────────────
export interface MistakeBook {
  mistake_id: number;
  student_id: number;
  problem_id: number;
  standard_answer: string;
  student_answer: string;
  first_wrong_date: Date;
  last_wrong_date: Date | null;
  wrong_count: number;
  is_corrected: boolean;
  corrected_date: Date | null;
  error_reason: string | null;
}

// ── 用户等级表 student_level ──────────────────────────────────
export interface StudentLevel {
  student_id: number;
  current_level: number;
  promotion_date: Date | null;
  correct_problems: number;
  wrong_problems: number;
  recent_20_correct_rate: number;
  is_promotion_qualified: boolean;
}

// ── 学习统计表 learning_statistic ─────────────────────────────
export interface LearningStatistic {
  statistic_id: number;
  student_id: number;
  statistic_date: Date;
  daily_problems: number;
  daily_correct: number;
  daily_wrong: number;
  daily_correct_rate: number;
  daily_avg_time: number;
  daily_study_duration: number;
  addition_correct_rate: number;
  subtraction_correct_rate: number;
  multiplication_correct_rate: number;
  division_correct_rate: number;
  mixed_operation_correct_rate: number;
}

// ── 系统配置表 system_config ──────────────────────────────────
export interface SystemConfig {
  config_id: number;
  config_key: string;
  config_value: string;
  config_type: string | null;
  config_desc: string | null;
  is_editable: boolean;
  update_date: Date;
}

// ── 请求 / 响应 DTO ───────────────────────────────────────────
export interface LoginDto {
  account: string;
  password: string;
  role: 'student' | 'teacher';
}

export interface SubmitAnswerDto {
  problem_id: number;
  answer_content: string;
  answer_time_seconds: number;
  session_id?: string;
  is_review?: boolean;
}

export interface GenerateProblemDto {
  difficulty_level?: number;
  operation_type?: OperationType;
  count?: number;
}

export interface LoginResult {
  token: string;
  userInfo: StudentPublic | TeacherPublic;
  role: 'student' | 'teacher';
}

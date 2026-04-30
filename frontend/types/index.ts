// ── 全局 App ─────────────────────────────────────────────────────

export interface AppGlobalData {
  token:    string;
  userInfo: StudentPublic | TeacherPublic | null;
  role:     'student' | 'teacher' | '';
}

// ── 用户 ──────────────────────────────────────────────────────────

export interface StudentPublic {
  student_id:             number;
  account:                string;
  name:                   string;
  class_id:               number;
  grade_id:               number;
  school_name?:           string | null;
  school_address?:        string | null;
  school_longitude?:      number | null;
  school_latitude?:       number | null;
  class_name?:            string;
  grade_name?:            string;
  gender:                 'male' | 'female' | 'unknown';
  current_level:          number;
  total_problems:         number;
  cumulative_correct_rate:number;
  account_status:         'active' | 'inactive' | 'banned';
  register_date:          string;
  last_login_time:        string | null;
}

export interface TeacherPublic {
  teacher_id:   number;
  name:         string;
  account:      string;
  email:        string | null;
  phone:        string | null;
  account_status: 'active' | 'inactive' | 'banned';
}

// ── 题目 ──────────────────────────────────────────────────────────

export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';

export interface Problem {
  problem_id:        number;
  problem_content:   string;
  problem_type:      OperationType;
  difficulty_level:  number;
  standard_answer:   string;
}

// ── 错题 ──────────────────────────────────────────────────────────

export interface MistakeBook {
  mistake_id:       number;
  student_id:       number;
  problem_id:       number;
  problem_content:  string;
  problem_type:     OperationType;
  standard_answer:  string;
  student_answer:   string;
  first_wrong_date: string;
  last_wrong_date:  string | null;
  wrong_count:      number;
  is_corrected:     boolean;
}

// ── 等级 ──────────────────────────────────────────────────────────

export interface StudentLevel {
  student_id:               number;
  current_level:            number;
  level_title:              string;
  correct_problems:         number;
  wrong_problems:           number;
  recent_20_correct_rate:   number;
  is_promotion_qualified:   boolean;
}

// ── 统计 ──────────────────────────────────────────────────────────

export interface StatsOverview {
  total_problems:          number;
  cumulative_correct_rate: number;
  recent_20_correct_rate:  number;
  session_count:           number;
  current_level:           number;
  today_problems:          number;
  today_correct_rate:      string;
}

export interface DailyStat {
  statistic_date:              string;
  daily_problems:              number;
  daily_correct:               number;
  daily_wrong:                 number;
  daily_correct_rate:          number;
  addition_correct_rate:       number;
  subtraction_correct_rate:    number;
  multiplication_correct_rate: number;
  division_correct_rate:       number;
}

// ── 作业 ──────────────────────────────────────────────────────────

export interface Homework {
  homework_id:    number;
  title:          string;
  problem_count:  number;
  difficulty_level: number;
  operation_type: OperationType;
  deadline:       string;
  status:         string;
  create_time:    string;
}

export interface HomeworkSubmission {
  submitted_at:  string;
  score:         number;
  correct_count: number;
  total:         number;
  correct_rate:  string;
  detail?:       Record<number, {
    answer_content: string;
    standard_answer?: string;
    problem_content?: string;
    is_correct: boolean;
  }>;
}

export interface HomeworkCompletion {
  student_id:   number;
  student_name: string;
  is_submitted: boolean;
  submitted_at: string | null;
  score:        number | null;
}

// ── 考试 ──────────────────────────────────────────────────────────

export interface Exam {
  exam_id:          number;
  title:            string;
  paper_id:         number;
  start_time:       string;
  end_time:         string;
  duration_minutes: number;
  status:           'draft' | 'published' | 'finished';
  problem_count:    number;
  total_score:      number;
}

export interface ExamResult {
  score:         number;
  total_score:   number;
  correct_count: number;
  total_count:   number;
  correct_rate:  string;
}

// ── 通用响应 ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  code:    number;
  message: string;
  data:    T;
}

export interface PagedData<T> {
  list:  T[];
  total: number;
}

import { request } from './request';
import { API } from '../constants/api';
import { ApiResponse, PagedData, Exam, ExamResult, Problem } from '../types/index';

export interface ExamPaperCreateBody {
  title:            string;
  problem_count:    number;
  difficulty_level: number;
  operation_type:   string;
}

export interface ExamPaperInfo {
  paper_id:         number;
  title:            string;
  problem_count:    number;
  difficulty_level: number;
  operation_type:   string;
  problems:         Problem[];
}

export interface CreateExamBody {
  paper_id:         number;
  title:            string;
  start_time:       string;
  end_time:         string;
  duration_minutes: number;
  student_ids?:     number[];
  class_ids?:       number[];
  assign_all?:      boolean;
}

export interface SubmitExamBody {
  answers: Array<{
    problem_id:          number;
    answer_content:      string;
    answer_time_seconds: number;
  }>;
}

export interface ExamDetail {
  exam:      Exam;
  problems:  Problem[];
  my_result: ExamResult | null;
}

export interface ExamStats {
  total:          number;
  submitted:      number;
  avg_score:      number;
  avg_rate:       string;
  score_dist:     Array<{ range: string; count: number }>;
  student_scores: Array<{ student_id: number; name: string; score: number; correct_rate: string }>;
}

// ── 老师端 ────────────────────────────────────────────────────────

export function teacherCreateExamPaper(
  body: ExamPaperCreateBody,
): Promise<ApiResponse<ExamPaperInfo>> {
  return request({ url: API.EXAM_PAPER_CREATE, method: 'POST', data: body });
}

export function getExamPaperDetail(paperId: number): Promise<ApiResponse<ExamPaperInfo>> {
  return request({ url: API.EXAM_PAPER_DETAIL.replace(':id', String(paperId)) });
}

export function teacherCreateExam(body: CreateExamBody): Promise<ApiResponse<{ exam_id: number }>> {
  return request({ url: API.EXAM_CREATE, method: 'POST', data: body });
}

export function teacherGetExamList(params: {
  page?: number; pageSize?: number; status?: string;
} = {}): Promise<ApiResponse<PagedData<Exam>>> {
  return request({ url: API.EXAM_TEACHER_LIST, data: params });
}

export function getExamStats(examId: number): Promise<ApiResponse<ExamStats>> {
  return request({ url: API.EXAM_STATS.replace(':id', String(examId)) });
}

// ── 学生端 ────────────────────────────────────────────────────────

export function studentGetExamList(params: {
  page?: number; pageSize?: number; status?: string;
} = {}): Promise<ApiResponse<PagedData<Exam & { my_status: string; my_score?: number }>>> {
  return request({ url: API.EXAM_STUDENT_LIST, data: params });
}

export function getExamDetail(examId: number): Promise<ApiResponse<ExamDetail>> {
  return request({ url: API.EXAM_DETAIL.replace(':id', String(examId)) });
}

export function studentSubmitExam(
  examId: number,
  body: SubmitExamBody,
): Promise<ApiResponse<ExamResult>> {
  return request({
    url:    API.EXAM_SUBMIT.replace(':id', String(examId)),
    method: 'POST',
    data:   body,
  });
}

export function getExamResult(examId: number): Promise<ApiResponse<ExamResult>> {
  return request({ url: API.EXAM_RESULT.replace(':id', String(examId)) });
}

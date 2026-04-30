import { request } from './request';
import { API } from '../constants/api';
import { ApiResponse, PagedData, Homework, Problem, HomeworkSubmission, HomeworkCompletion } from '../types/index';

export interface CreateHomeworkBody {
  title:             string;
  problem_count:     number;
  difficulty_level:  number;
  operation_type:    string;
  deadline:          string;
  student_ids?:      number[];
  class_ids?:        number[];
}

export interface HomeworkDetail {
  homework:      Homework;
  problems:      Problem[];
  my_submission: HomeworkSubmission | null;
}

export interface SubmitHomeworkBody {
  answers: Array<{
    problem_id:          number;
    answer_content:      string;
    answer_time_seconds: number;
  }>;
}

export interface SubmitHomeworkResult {
  correct_count: number;
  total:         number;
  score:         number;
  correct_rate:  string;
  detail:        HomeworkSubmission['detail'];
}

export interface CompletionData {
  total:     number;
  submitted: number;
  list:      HomeworkCompletion[];
}

// ── 老师端 ────────────────────────────────────────────────────────

export function teacherCreateHomework(
  body: CreateHomeworkBody,
): Promise<ApiResponse<{ homework_id: number }>> {
  return request({ url: API.HOMEWORK_CREATE, method: 'POST', data: body });
}

export function teacherGetHomeworkList(params: {
  page?: number; pageSize?: number; status?: string;
} = {}): Promise<ApiResponse<PagedData<Homework>>> {
  return request({ url: API.HOMEWORK_TEACHER_LIST, data: params });
}

export function getHomeworkCompletion(homeworkId: number): Promise<ApiResponse<CompletionData>> {
  return request({ url: API.HOMEWORK_COMPLETION.replace(':id', String(homeworkId)) });
}

// ── 学生端 ────────────────────────────────────────────────────────

export function studentGetHomeworkList(params: {
  page?: number; pageSize?: number; status?: string;
} = {}): Promise<ApiResponse<PagedData<Homework & { status: string; submitted_count?: number }>>> {
  return request({ url: API.HOMEWORK_STUDENT_LIST, data: params });
}

export function getHomeworkDetail(homeworkId: number): Promise<ApiResponse<HomeworkDetail>> {
  return request({ url: API.HOMEWORK_DETAIL.replace(':id', String(homeworkId)) });
}

export function studentSubmitHomework(
  homeworkId: number,
  body: SubmitHomeworkBody,
): Promise<ApiResponse<SubmitHomeworkResult>> {
  return request({
    url:    API.HOMEWORK_SUBMIT.replace(':id', String(homeworkId)),
    method: 'POST',
    data:   body,
  });
}

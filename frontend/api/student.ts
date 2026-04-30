import { request } from './request';
import { API } from '../constants/api';
import {
  ApiResponse, PagedData,
  StudentPublic, StudentLevel,
  Problem, MistakeBook,
  StatsOverview, DailyStat,
} from '../types/index';

export interface LoginResult {
  token:    string;
  userInfo: StudentPublic;
  role:     'student';
}

export interface SubmitAnswerResult {
  is_correct:      boolean;
  standard_answer: string;
  score:           number;
}

export interface GenerateParams {
  difficulty_level?: number;
  operation_type?:   string;
  count?:            number;
}

export interface SubmitAnswerBody {
  problem_id:          number;
  answer_content:      string;
  answer_time_seconds: number;
  session_id?:         string;
  is_review?:          boolean;
}

export function login(account: string, password: string): Promise<ApiResponse<LoginResult>> {
  return request({
    url:     API.STUDENT_LOGIN,
    method:  'POST',
    data:    { account, password },
    noToken: true,
  });
}

export function getStudentInfo(): Promise<ApiResponse<StudentPublic>> {
  return request({ url: API.STUDENT_INFO });
}

export function getStudentLevel(): Promise<ApiResponse<StudentLevel>> {
  return request({ url: API.STUDENT_LEVEL });
}

export function generateProblems(params: GenerateParams = {}): Promise<ApiResponse<Problem[]>> {
  return request<{ count: number; problems: Problem[] } | Problem[]>({
    url:  API.PROBLEM_GENERATE,
    data: params,
  }).then((res) => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : (res.data?.problems ?? []),
  }));
}

export function submitAnswer(body: SubmitAnswerBody): Promise<ApiResponse<SubmitAnswerResult>> {
  return request({ url: API.PROBLEM_SUBMIT, method: 'POST', data: body });
}

export function resetPassword(data: {
  oldPassword: string;
  newPassword: string;
}): Promise<ApiResponse<null>> {
  return request({
    url:    API.STUDENT_RESET_PASSWORD,
    method: 'POST',
    data,
  });
}

export function getMistakes(params: {
  page?: number; pageSize?: number; is_corrected?: boolean;
} = {}): Promise<ApiResponse<PagedData<MistakeBook>>> {
  return request({ url: API.MISTAKES_LIST, data: params });
}

// 后端：PUT /api/mistakes/:id/corrected
export function markMistakeCorrected(mistakeId: number): Promise<ApiResponse<void>> {
  return request({
    url:    API.MISTAKE_MARK_CORRECTED.replace(':id', String(mistakeId)),
    method: 'PUT',
  });
}

// 后端：GET /api/stats/summary  返回 Summary 结构
export function getStatsOverview(): Promise<ApiResponse<StatsOverview>> {
  return request({ url: API.STATS_OVERVIEW });
}

// 后端接受 days 参数（整数），例如 days=7
export function getDailyStats(days = 7): Promise<ApiResponse<DailyStat[]>> {
  return request({ url: API.STATS_DAILY, data: { days } });
}

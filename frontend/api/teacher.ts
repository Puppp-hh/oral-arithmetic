import { request } from './request';
import { API } from '../constants/api';
import {
  ApiResponse, PagedData,
  TeacherPublic, StudentPublic, StudentLevel,
  DailyStat, StatsOverview,
} from '../types/index';

export interface LoginResult {
  token:    string;
  userInfo: TeacherPublic;
  role:     'teacher';
}

export interface ClassStats {
  student_count:     number;
  avg_correct_rate:  number;
  homework_count:    number;
  exam_count:        number;
  top_mistakes?:     Array<{ problem_content: string; error_count: number }>;
}

export interface StudentDetailStats {
  overview:       StatsOverview;
  daily:          DailyStat[];
  level:          StudentLevel;
  mistakes_count: number;
}

export interface ResetPasswordResult {
  temp_password: string;
}

export function login(account: string, password: string): Promise<ApiResponse<LoginResult>> {
  return request({
    url:     API.TEACHER_LOGIN,
    method:  'POST',
    data:    { account, password },
    noToken: true,
  });
}

export function getTeacherInfo(): Promise<ApiResponse<TeacherPublic>> {
  return request({ url: API.TEACHER_INFO });
}

export function getStudentList(params: {
  page?: number; pageSize?: number; keyword?: string; classId?: number;
} = {}): Promise<ApiResponse<PagedData<StudentPublic>>> {
  return request({ url: API.TEACHER_STUDENTS, data: params });
}

export function getStudentDetail(studentId: number): Promise<ApiResponse<StudentPublic>> {
  return request({ url: API.TEACHER_STUDENT_DETAIL.replace(':id', String(studentId)) });
}

export function getStudentStats(studentId: number): Promise<ApiResponse<StudentDetailStats>> {
  return request({ url: API.TEACHER_STUDENT_STATS.replace(':id', String(studentId)) });
}

/**
 * 重置学生密码，返回临时密码。
 * 页面展示时必须提示：请通知学生尽快修改密码。
 */
export function resetStudentPassword(studentId: number): Promise<ApiResponse<ResetPasswordResult>> {
  return request({
    url:    API.TEACHER_STUDENT_RESET_PWD.replace(':id', String(studentId)),
    method: 'POST',
  });
}

export function getClassStats(params: { classId?: number } = {}): Promise<ApiResponse<ClassStats>> {
  return request({ url: API.TEACHER_CLASS_STATS, data: params });
}

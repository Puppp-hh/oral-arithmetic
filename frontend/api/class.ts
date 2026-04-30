import { request } from './request';
import { API } from '../constants/api';
import { ApiResponse, PagedData, StudentPublic } from '../types/index';

export interface ClassInfo {
  class_id:                number;
  class_name:              string;
  grade_id:                number;
  grade_name:              string;
  teacher_id:              number;
  student_count:           number;
  invite_code:             string | null;
  invite_code_status:      'active' | 'disabled';
  invite_code_expire_time: string | null;
  created_date:            string;
}

export interface InviteCodeInfo {
  class_id:                number;
  class_name:              string;
  grade_name?:             string;
  invite_code:             string;
  invite_code_status:      'active' | 'disabled';
  invite_code_expire_time: string | null;
}

export function getMyInviteCode(): Promise<ApiResponse<InviteCodeInfo | null>> {
  return request({ url: API.TEACHER_MY_INVITE_CODE });
}

export function getMyClasses(): Promise<ApiResponse<ClassInfo[]>> {
  return request({ url: API.TEACHER_CLASSES });
}

export function createClass(data: {
  className: string;
  gradeId:   number;
}): Promise<ApiResponse<ClassInfo>> {
  return request({ url: API.TEACHER_CLASSES, method: 'POST', data });
}

export function deleteClass(classId: number): Promise<ApiResponse<null>> {
  return request({
    url:    API.TEACHER_CLASS_DETAIL.replace(':id', String(classId)),
    method: 'DELETE',
  });
}

export function getClassInviteCode(classId: number): Promise<ApiResponse<InviteCodeInfo>> {
  return request({
    url: API.TEACHER_CLASS_INVITE_CODE.replace(':id', String(classId)),
  });
}

export function refreshClassInviteCode(classId: number): Promise<ApiResponse<InviteCodeInfo>> {
  return request({
    url:    API.TEACHER_CLASS_INVITE_CODE.replace(':id', String(classId)),
    method: 'PUT',
  });
}

export function getClassStudents(classId: number): Promise<ApiResponse<PagedData<StudentPublic>>> {
  return request({
    url: API.TEACHER_CLASS_STUDENTS.replace(':id', String(classId)),
  });
}

export function bindInviteCode(inviteCode: string): Promise<ApiResponse<StudentPublic>> {
  return request({
    url:    API.STUDENT_BIND_INVITE_CODE,
    method: 'POST',
    data:   { inviteCode },
  });
}

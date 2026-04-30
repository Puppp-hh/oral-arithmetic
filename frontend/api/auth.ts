import { request } from './request';
import { API } from '../constants/api';
import { ApiResponse, StudentPublic, TeacherPublic } from '../types/index';

export interface StudentRegisterParams {
  account:      string;
  password:     string;
  name:         string;
  inviteCode:   string;
  gender?:      'male' | 'female';
}

export interface TeacherRegisterParams {
  account:         string;
  password:        string;
  name:            string;
  schoolName:      string;
  schoolAddress?:  string;
  schoolLongitude?: number;
  schoolLatitude?:  number;
  phone?:          string;
  email?:          string;
}

export function studentRegister(
  data: StudentRegisterParams,
): Promise<ApiResponse<StudentPublic>> {
  return request({
    url:     API.STUDENT_REGISTER,
    method:  'POST',
    data,
    noToken: true,
  });
}

export function teacherRegister(
  data: TeacherRegisterParams,
): Promise<ApiResponse<TeacherPublic>> {
  return request({
    url:     API.TEACHER_REGISTER,
    method:  'POST',
    data,
    noToken: true,
  });
}

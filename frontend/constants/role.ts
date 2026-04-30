export const ROLE = {
  STUDENT: 'student' as const,
  TEACHER: 'teacher' as const,
};

export type Role = 'student' | 'teacher';

export const ROLE_HOME: Record<string, string> = {
  student: '/pages/student/home/home',
  teacher: '/pages/teacher/home/home',
};

export const ROLE_LOGIN: Record<string, string> = {
  student: '/pages/student/login/login',
  teacher: '/pages/teacher/login/login',
};

import * as storage from './storage';
import { ROLE, ROLE_HOME, ROLE_LOGIN, Role } from '../constants/role';
import { AppGlobalData, StudentPublic, TeacherPublic } from '../types/index';

interface AppInstance {
  globalData: AppGlobalData;
}

function app(): AppInstance {
  return getApp<AppInstance>();
}

// ── 写入 ──────────────────────────────────────────────────────────

export function saveLogin(
  token: string,
  userInfo: StudentPublic | TeacherPublic,
  role: Role,
): void {
  storage.set(storage.KEYS.TOKEN,     token);
  storage.set(storage.KEYS.USER_INFO, userInfo);
  storage.set(storage.KEYS.ROLE,      role);
  const g = app().globalData;
  g.token    = token;
  g.userInfo = userInfo;
  g.role     = role;
}

// ── 读取 ──────────────────────────────────────────────────────────

export function getToken(): string {
  return app().globalData.token || storage.get<string>(storage.KEYS.TOKEN) || '';
}

export function getUserInfo(): StudentPublic | TeacherPublic | null {
  return app().globalData.userInfo
    ?? storage.get<StudentPublic | TeacherPublic>(storage.KEYS.USER_INFO);
}

export function getRole(): Role | '' {
  return app().globalData.role
    || storage.get<Role>(storage.KEYS.ROLE)
    || '';
}

// ── 判断 ──────────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function isStudent(): boolean {
  return getRole() === ROLE.STUDENT;
}

export function isTeacher(): boolean {
  return getRole() === ROLE.TEACHER;
}

// ── 清除 ──────────────────────────────────────────────────────────

export function clearLogin(): void {
  const g = app().globalData;
  g.token    = '';
  g.userInfo = null;
  g.role     = '';
  storage.remove(storage.KEYS.TOKEN);
  storage.remove(storage.KEYS.USER_INFO);
  storage.remove(storage.KEYS.ROLE);
}

// ── 跳转 ──────────────────────────────────────────────────────────

export function redirectToLogin(): void {
  const role = getRole();
  clearLogin();
  wx.reLaunch({ url: ROLE_LOGIN[role] || ROLE_LOGIN.student });
}

export function redirectToHome(role: Role): void {
  wx.reLaunch({ url: ROLE_HOME[role] || ROLE_HOME.student });
}

// ── 页面守卫 ──────────────────────────────────────────────────────

/**
 * 在 onLoad 最开头调用。非学生立即跳走，返回 false 表示被拦截。
 *
 * 示例：
 *   onLoad() {
 *     if (!requireStudent()) return;
 *     ...
 *   }
 */
export function requireStudent(): boolean {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: ROLE_LOGIN.student });
    return false;
  }
  if (!isStudent()) {
    wx.showToast({ title: '无权限访问学生页面', icon: 'none' });
    wx.reLaunch({ url: ROLE_LOGIN.student });
    return false;
  }
  return true;
}

export function requireTeacher(): boolean {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: ROLE_LOGIN.teacher });
    return false;
  }
  if (!isTeacher()) {
    wx.showToast({ title: '无权限访问教师页面', icon: 'none' });
    wx.reLaunch({ url: ROLE_LOGIN.teacher });
    return false;
  }
  return true;
}

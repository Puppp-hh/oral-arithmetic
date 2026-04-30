export const KEYS = {
  TOKEN:     'token',
  USER_INFO: 'userInfo',
  ROLE:      'role',
} as const;

export function set(key: string, value: unknown): void {
  wx.setStorageSync(key, value);
}

export function get<T = unknown>(key: string): T | null {
  const val = wx.getStorageSync(key);
  return (val === '' || val === undefined || val === null) ? null : (val as T);
}

export function remove(key: string): void {
  wx.removeStorageSync(key);
}

export function clear(): void {
  wx.clearStorageSync();
}

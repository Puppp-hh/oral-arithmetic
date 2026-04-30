import { BASE_URL } from '../constants/api';
import * as auth from '../utils/auth';
import { ApiResponse } from '../types/index';

export interface RequestOptions {
  url:      string;
  method?:  'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?:    Record<string, unknown> | object;
  noToken?: boolean;
  silent?:  boolean;
}

export function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const token  = auth.getToken();
    const header: Record<string, string> = { 'Content-Type': 'application/json' };

    if (!options.noToken && token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url:    BASE_URL + options.url,
      method: options.method ?? 'GET',
      data:   options.data   ?? {},
      header,

      success(res) {
        const body       = res.data as ApiResponse<T>;
        const statusCode = res.statusCode;
        const code       = body?.code;

        if (code === 200 || code === 201) {
          resolve(body);
          return;
        }

        if ((code === 401 || statusCode === 401) && !options.noToken) {
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
          setTimeout(() => auth.redirectToLogin(), 1500);
          reject(new Error('登录已过期'));
          return;
        }

        const msg = getErrorMessage(body, statusCode);
        if (!options.silent) {
          wx.showToast({ title: msg, icon: 'none', duration: 2500 });
        }
        reject(new Error(msg));
      },

      fail(err) {
        console.error('[request] 网络错误', options.url, err);
        wx.showToast({ title: '网络连接失败，请检查服务器', icon: 'none', duration: 2500 });
        reject(new Error('网络请求失败'));
      },
    });
  });
}

function getErrorMessage<T>(body: ApiResponse<T> | undefined, statusCode: number): string {
  const errors = (body?.data as { errors?: Array<{ message?: string }> } | undefined)?.errors;
  if (Array.isArray(errors) && errors.length > 0 && errors[0].message) {
    return errors[0].message;
  }
  return body?.message ?? `请求失败（${statusCode}）`;
}

/**
 * 文件说明：HTTP 请求封装工具
 * 系统作用：统一管理所有 wx.request 调用，自动注入 Bearer token，
 *          统一处理 401（跳回登录）和错误提示
 * 调用链：页面 → request(options) → wx.request → 后端 API → 返回 Promise
 *
 * 使用示例：
 *   const { request } = require('../../utils/request');
 *   const res = await request({ url: '/api/auth/student/login', method: 'POST', data: {...} });
 */
const app = getApp();

/**
 * 发起请求
 * @param {object} options
 * @param {string} options.url        相对路径，如 /api/problems/generate
 * @param {'GET'|'POST'|'PUT'|'DELETE'} options.method 默认 GET
 * @param {object} options.data       请求体 / query 参数
 * @param {boolean} options.noToken   true = 不附加 Authorization 头（登录接口用）
 * @returns {Promise<{code, message, data}>}
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('token') || '';
    const header = { 'Content-Type': 'application/json' };
    if (!options.noToken && token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url: app.globalData.BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      success(res) {
        const body = res.data;
        if (body.code === 200 || body.code === 201) {
          resolve(body);
        } else if (body.code === 401) {
          // Token 失效，清除状态并跳回登录
          clearLogin();
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' });
          }, 1500);
          reject(new Error(body.message));
        } else {
          wx.showToast({ title: body.message || '请求失败', icon: 'none' });
          reject(new Error(body.message || '请求失败'));
        }
      },
      fail(err) {
        console.error('[Request] 网络错误:', err);
        wx.showToast({ title: '网络连接失败，请检查服务器', icon: 'none', duration: 2500 });
        reject(new Error('网络请求失败'));
      }
    });
  });
}

function clearLogin() {
  app.globalData.token    = '';
  app.globalData.userInfo = null;
  app.globalData.role     = '';
  wx.clearStorageSync();
}

module.exports = { request, clearLogin };

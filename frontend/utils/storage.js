/**
 * 文件说明：本地存储工具
 * 系统作用：封装 wx.setStorageSync / getStorageSync，
 *          统一管理 token / userInfo / role 的读写
 * 调用链：login.js → storage.saveLogin → wx.setStorageSync
 *         request.js → wx.getStorageSync('token')
 */

function saveLogin(token, userInfo, role) {
  wx.setStorageSync('token',    token);
  wx.setStorageSync('userInfo', userInfo);
  wx.setStorageSync('role',     role);
  const app = getApp();
  app.globalData.token    = token;
  app.globalData.userInfo = userInfo;
  app.globalData.role     = role;
}

function getToken()    { return wx.getStorageSync('token')    || ''; }
function getUserInfo() { return wx.getStorageSync('userInfo') || null; }
function getRole()     { return wx.getStorageSync('role')     || ''; }

function clearLogin() {
  wx.clearStorageSync();
  const app = getApp();
  app.globalData.token    = '';
  app.globalData.userInfo = null;
  app.globalData.role     = '';
}

module.exports = { saveLogin, getToken, getUserInfo, getRole, clearLogin };

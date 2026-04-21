/**
 * 文件说明：小程序入口文件
 * 系统作用：管理全局数据（token / userInfo / role），
 *          启动时恢复本地缓存，供所有页面通过 getApp() 访问
 * 调用链：微信运行时 → App.onLaunch → 页面 getApp().globalData
 */
App({
  globalData: {
    token: '',
    userInfo: null,
    role: '',          // 'student' | 'teacher'
    BASE_URL: 'http://127.0.0.1:3000'
  },

  onLaunch() {
    // 从本地存储恢复登录态
    const token    = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const role     = wx.getStorageSync('role');

    if (token) {
      this.globalData.token    = token;
      this.globalData.userInfo = userInfo;
      this.globalData.role     = role;
    }
  }
});

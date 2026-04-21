/**
 * 文件说明：登录页逻辑
 * 系统作用：学生/教师角色切换，账号密码提交，写 token 到全局和本地存储
 * 调用链：用户点击登录 → request POST /api/auth/:role/login
 *                      → storage.saveLogin → wx.switchTab /pages/home/home
 */
const { request } = require('../../utils/request');
const { saveLogin } = require('../../utils/storage');

Page({
  data: {
    role: 'student',        // 'student' | 'teacher'
    account: '',
    password: '',
    loading: false,
    roleList: [
      { label: '学生登录', value: 'student' },
      { label: '教师登录', value: 'teacher' }
    ]
  },

  onLoad() {
    // 已登录则直接跳首页
    const token = wx.getStorageSync('token');
    if (token) {
      wx.switchTab({ url: '/pages/home/home' });
    }
  },

  // 切换角色
  switchRole(e) {
    this.setData({ role: e.currentTarget.dataset.role });
  },

  onAccountInput(e)  { this.setData({ account: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },

  // 登录
  async onLogin() {
    const { role, account, password } = this.data;

    if (!account.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }
    if (!password.trim()) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/auth/${role}/login`,
        method: 'POST',
        data: { account: account.trim(), password: password.trim() },
        noToken: true
      });

      const { token, userInfo } = res.data;
      saveLogin(token, userInfo, role);

      wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 800);

    } catch (err) {
      // request 内部已 showToast
    } finally {
      this.setData({ loading: false });
    }
  }
});

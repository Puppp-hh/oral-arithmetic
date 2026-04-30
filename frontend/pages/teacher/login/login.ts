import * as teacherApi from '../../../api/teacher';
import * as auth from '../../../utils/auth';

Page({
  data: {
    account:  '',
    password: '',
    loading:  false,
  },

  onLoad() {
    if (auth.isLoggedIn() && auth.isTeacher()) {
      wx.reLaunch({ url: '/pages/teacher/home/home' });
    } else if (auth.isLoggedIn() && auth.isStudent()) {
      wx.reLaunch({ url: '/pages/student/home/home' });
    }
  },

  onAccountInput(e: WechatMiniprogram.Input) {
    this.setData({ account: e.detail.value });
  },

  onPasswordInput(e: WechatMiniprogram.Input) {
    this.setData({ password: e.detail.value });
  },

  async onLogin() {
    const { account, password } = this.data;
    if (!account.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' }); return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' }); return;
    }
    this.setData({ loading: true });
    try {
      const res = await teacherApi.login(account.trim(), password);
      auth.saveLogin(res.data.token, res.data.userInfo, 'teacher');
      wx.reLaunch({ url: '/pages/teacher/home/home' });
    } catch {
      // 错误已在 request.ts 中展示
    } finally {
      this.setData({ loading: false });
    }
  },

  goStudentLogin() {
    wx.reLaunch({ url: '/pages/student/login/login' });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/teacher/register/register' });
  },
});

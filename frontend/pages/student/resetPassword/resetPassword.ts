import * as auth from '../../../utils/auth';
import { resetPassword } from '../../../api/student';

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
  },

  onLoad() {
    if (!auth.requireStudent()) return;
  },

  onInput(e: WechatMiniprogram.Input) {
    const field = (e.currentTarget.dataset as { field: string }).field;
    this.setData({ [field]: e.detail.value });
  },

  async onSubmit() {
    const { oldPassword, newPassword, confirmPassword } = this.data;
    if (!oldPassword) {
      wx.showToast({ title: '请输入原密码', icon: 'none' });
      return;
    }
    if (newPassword.length < 6) {
      wx.showToast({ title: '新密码至少 6 位', icon: 'none' });
      return;
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次新密码不一致', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      await resetPassword({ oldPassword, newPassword });
      wx.showToast({ title: '密码已重置', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ loading: false });
    }
  },
});

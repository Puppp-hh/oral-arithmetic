import { studentRegister } from '../../../api/auth';

Page({
  data: {
    form: {
      account:         '',
      password:        '',
      confirmPassword: '',
      name:            '',
      inviteCode:      '',
    },
    loading: false,
  },

  onInput(e: WechatMiniprogram.Input) {
    const field = (e.currentTarget.dataset as { field: string }).field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onInviteInput(e: WechatMiniprogram.Input) {
    this.setData({ 'form.inviteCode': e.detail.value.toUpperCase() });
  },

  async onSubmit() {
    const { account, password, confirmPassword, name, inviteCode } = this.data.form;

    if (!account.trim()) { wx.showToast({ title: '请输入账号', icon: 'none' }); return; }
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(account)) {
      wx.showToast({ title: '账号只能含字母/数字/下划线，3-50位', icon: 'none' }); return;
    }
    if (password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
    if (password !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
    if (!name.trim()) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return; }
    if (!inviteCode.trim()) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return; }

    this.setData({ loading: true });
    try {
      await studentRegister({
        account:    account.trim(),
        password,
        name:       name.trim(),
        inviteCode: inviteCode.trim(),
      });
      wx.showToast({ title: '注册成功', icon: 'success', duration: 1500 });
      setTimeout(() => wx.redirectTo({ url: '/pages/student/login/login' }), 1500);
    } catch {
      // 错误已在 request.ts 中 toast 展示
    } finally {
      this.setData({ loading: false });
    }
  },

  goLogin() {
    wx.navigateBack({ delta: 1 });
  },
});

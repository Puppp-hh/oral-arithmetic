import * as auth from '../../../utils/auth';
import { bindInviteCode } from '../../../api/class';
import { StudentPublic } from '../../../types/index';

Page({
  data: {
    inviteCode:   '',
    loading:      false,
    currentClass: '',
  },

  onLoad() {
    if (!auth.requireStudent()) return;
    const userInfo = auth.getUserInfo() as StudentPublic | null;
    if (userInfo && (userInfo as any).class_id) {
      this.setData({ currentClass: `班级 ID ${(userInfo as any).class_id}` });
    }
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() });
  },

  async onSubmit() {
    const code = this.data.inviteCode.trim();
    if (!code) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return; }
    if (code.length < 4) { wx.showToast({ title: '邀请码格式不正确', icon: 'none' }); return; }

    this.setData({ loading: true });
    try {
      const res = await bindInviteCode(code);
      if (res.data) {
        auth.saveLogin(auth.getToken()!, res.data, 'student');
      }
      wx.showToast({ title: '更换成功', icon: 'success', duration: 1500 });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1500);
    } catch {
      // 错误已在 request.ts 中展示
    } finally {
      this.setData({ loading: false });
    }
  },
});

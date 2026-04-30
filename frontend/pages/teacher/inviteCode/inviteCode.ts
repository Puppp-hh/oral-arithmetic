import * as auth from '../../../utils/auth';
import {
  getClassInviteCode,
  refreshClassInviteCode,
  getClassStudents,
  InviteCodeInfo,
} from '../../../api/class';
import { StudentPublic } from '../../../types/index';

Page({
  data: {
    classId:        0,
    codeInfo:       {} as Partial<InviteCodeInfo> & { grade_name?: string },
    students:       [] as StudentPublic[],
    total:          0,
    loadingStudents: false,
  },

  onLoad(options: { classId?: string }) {
    if (!auth.requireTeacher()) return;
    const classId = Number(options.classId);
    if (!classId) { wx.navigateBack({ delta: 1 }); return; }
    this.setData({ classId });
    this.loadAll(classId);
  },

  async loadAll(classId: number) {
    this.setData({ loadingStudents: true });
    const [codeRes, studentsRes] = await Promise.allSettled([
      getClassInviteCode(classId),
      getClassStudents(classId),
    ]);

    if (codeRes.status === 'fulfilled' && codeRes.value.data) {
      this.setData({ codeInfo: codeRes.value.data });
    }
    if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
      const d = studentsRes.value.data;
      this.setData({
        students: d.list ?? [],
        total:    d.total ?? 0,
      });
    }
    this.setData({ loadingStudents: false });
  },

  onCopy() {
    const code = this.data.codeInfo.invite_code;
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
    });
  },

  onRefresh() {
    wx.showModal({
      title: '重置邀请码',
      content: '重置后旧邀请码不能再用于新学生加入；已绑定学生不受影响。确认重置？',
      confirmColor: '#f5222d',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const r = await refreshClassInviteCode(this.data.classId);
          if (r.data) {
            this.setData({ 'codeInfo.invite_code': r.data.invite_code });
            wx.showToast({ title: '邀请码已重置', icon: 'success' });
          }
        } catch (err) {
          console.warn('[inviteCode] refresh invite code failed', err);
        }
      },
    });
  },
});

import * as auth from '../../../utils/auth';
import { deleteClass, getMyClasses, ClassInfo } from '../../../api/class';

Page({
  data: {
    list:    [] as ClassInfo[],
    loading: false,
    deleteDialog: {
      visible: false,
      classId: 0,
      className: '',
    },
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.loadClasses();
  },

  async loadClasses() {
    this.setData({ loading: true });
    try {
      const res = await getMyClasses();
      this.setData({ list: res.data ?? [] });
    } catch {
      // 错误已在 request.ts 中展示
    } finally {
      this.setData({ loading: false });
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/teacher/classCreate/classCreate' });
  },

  goInviteCode(e: WechatMiniprogram.Touch) {
    const classId = (e.currentTarget.dataset as { id: number }).id;
    wx.navigateTo({ url: `/pages/teacher/inviteCode/inviteCode?classId=${classId}` });
  },

  onDeleteClass(e: WechatMiniprogram.Touch) {
    const dataset = e.currentTarget.dataset as { id: number; count: number; name: string };
    const classId = Number(dataset.id);
    const studentCount = Number(dataset.count || 0);
    const className = dataset.name || '该班级';
    if (studentCount > 0) {
      wx.showToast({ title: '班级内有学生，不能删除', icon: 'none' });
      return;
    }

    this.setData({
      deleteDialog: {
        visible: true,
        classId,
        className,
      },
    });
  },

  onCancelDelete() {
    this.setData({ 'deleteDialog.visible': false });
  },

  async onConfirmDelete() {
    const { classId } = this.data.deleteDialog;
    if (!classId) return;
    try {
      await deleteClass(classId);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.setData({ 'deleteDialog.visible': false });
      this.loadClasses();
    } catch {
      // request.ts 已展示错误
    }
  },
});

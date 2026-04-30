import * as auth from '../../../utils/auth';
import { getTeacherInfo, getClassStats } from '../../../api/teacher';
import { getMyClasses, ClassInfo } from '../../../api/class';
import { formatRate } from '../../../utils/format';

Page({
  data: {
    teacherInfo:  null as any,
    classStats:   {} as any,
    classList:    [] as ClassInfo[],
    classNames:   [] as string[],
    selectedClassIndex: 0,
    inviteInfo:   null as ClassInfo | null,
    inviteLoaded: false,
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
    this.setData({ teacherInfo: auth.getUserInfo() });
    this.loadData();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.loadData();
  },

  async loadData() {
    try {
      const [infoRes, classRes] = await Promise.all([
        getTeacherInfo().catch(() => null),
        getMyClasses().catch(() => null),
      ]);
      if (infoRes?.data) {
        this.setData({ teacherInfo: infoRes.data });
      }

      const classes = classRes?.data ?? [];
      const selectedIndex = Math.min(this.data.selectedClassIndex, Math.max(0, classes.length - 1));
      this.setData({
        classList: classes,
        classNames: classes.map((item) => item.class_name),
        selectedClassIndex: selectedIndex,
        inviteInfo: classes[selectedIndex] ?? null,
        inviteLoaded: true,
      });
      await this.loadClassStats(classes[selectedIndex]?.class_id);
    } catch (err) {
      console.warn('[teacherHome] load dashboard failed', err);
      this.setData({ inviteLoaded: true });
    }
  },

  async loadClassStats(classId?: number) {
    const statsRes = await getClassStats({ classId }).catch(() => null);
    if (statsRes?.data) {
      const d = statsRes.data;
      this.setData({
        classStats: { ...d, avgRateText: formatRate(d.avg_correct_rate) },
      });
    }
  },

  onClassPickerChange(e: WechatMiniprogram.PickerChange) {
    const index = Number(e.detail.value);
    this.setData({
      selectedClassIndex: index,
      inviteInfo: this.data.classList[index] ?? null,
    });
    this.loadClassStats(this.data.classList[index]?.class_id);
  },

  onCopyCode() {
    const code = this.data.inviteInfo?.invite_code;
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
    });
  },

  goCreateClass() {
    wx.navigateTo({ url: '/pages/teacher/classCreate/classCreate' });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出？',
      success: (res) => {
        if (res.confirm) auth.redirectToLogin();
      },
    });
  },

  goClassManage()    { wx.navigateTo({ url: '/pages/teacher/classManage/classManage' }); },
  goStudents()       { wx.navigateTo({ url: '/pages/teacher/students/students' }); },
  goHomeworkManage() { wx.navigateTo({ url: '/pages/teacher/homeworkManage/homeworkManage' }); },
  goExamManage()     { wx.navigateTo({ url: '/pages/teacher/examManage/examManage' }); },
  goStats()          { wx.navigateTo({ url: '/pages/teacher/stats/stats' }); },
});

import * as auth from '../../../utils/auth';
import * as studentApi from '../../../api/student';
import { studentGetHomeworkList } from '../../../api/homework';
import { studentGetExamList } from '../../../api/exam';
import { getLevelTitle, formatDate } from '../../../utils/format';

Page({
  data: {
    userInfo:            null as any,
    levelInfo:           { current_level: 1, level_title: '口算萌新' } as any,
    statsOverview:       {} as any,
    pendingHomeworkCount: 0,
    pendingExamCount:     0,
    todayDate:           '',
  },

  onLoad() {
    if (!auth.requireStudent()) return;
    this.setData({
      userInfo:  auth.getUserInfo(),
      todayDate: formatDate(new Date(), 'MM月DD日'),
    });
    this.loadData();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.loadData();
  },

  async loadData() {
    try {
      const [statsRes, hwRes, examRes] = await Promise.all([
        studentApi.getStatsOverview().catch(() => null),
        studentGetHomeworkList({ pageSize: 50 }).catch(() => null),
        studentGetExamList({ pageSize: 50 }).catch(() => null),
      ]);

      if (statsRes?.data) {
        const d = statsRes.data as any;
        this.setData({
          statsOverview: {
            today_problems:    d.today_problems ?? 0,
            today_correct_rate: typeof d.today_correct_rate === 'number'
              ? d.today_correct_rate.toFixed(1) + '%'
              : (d.today_correct_rate ?? '0%'),
            total_problems: d.total_problems ?? 0,
          },
          levelInfo: {
            current_level: d.current_level ?? 1,
            level_title: getLevelTitle(d.current_level ?? 1),
          },
        });
      }

      if (hwRes?.data?.list) {
        const pending = (hwRes.data.list as any[]).filter(
          (h) => h.my_status === 'pending' || h.status === 'pending' || h.status === 'not_submitted',
        ).length;
        this.setData({ pendingHomeworkCount: pending });
      }

      if (examRes?.data?.list) {
        const pending = (examRes.data.list as any[]).filter(
          (e) => e.my_status === 'pending' || e.my_status === 'not_started' || e.my_status === 'in_progress',
        ).length;
        this.setData({ pendingExamCount: pending });
      }
    } catch (err) {
      console.warn('[studentHome] load dashboard failed', err);
    }
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

  goTrain()    { wx.switchTab({ url: '/pages/student/train/train' }); },
  goHomework() { wx.navigateTo({ url: '/pages/student/homework/homework' }); },
  goExam()     { wx.navigateTo({ url: '/pages/student/exam/exam' }); },
  goMistakes() { wx.switchTab({ url: '/pages/student/mistakes/mistakes' }); },
  goStats()    { wx.switchTab({ url: '/pages/student/stats/stats' }); },
  goResetPwd() { wx.navigateTo({ url: '/pages/student/resetPassword/resetPassword' }); },
});

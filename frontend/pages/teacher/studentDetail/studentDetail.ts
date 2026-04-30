import * as auth from '../../../utils/auth';
import { getStudentDetail, getStudentStats, resetStudentPassword } from '../../../api/teacher';
import { getLevelTitle, formatRate, getRateTone, formatDate, clampPercent } from '../../../utils/format';

Page({
  data: {
    loading:      true,
    student:      null as any,
    stats:        null as any,
    dailyList:    [] as any[],
    resetting:    false,
    showTempPwd:  false,
    tempPassword: '',
    studentId:    0,
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireTeacher()) return;
    const id = Number(options.id);
    if (!id) { wx.navigateBack(); return; }
    this.setData({ studentId: id });
    this.loadData(id);
  },

  async loadData(id: number) {
    this.setData({ loading: true });
    try {
      const [detailRes, statsRes] = await Promise.all([
        getStudentDetail(id),
        getStudentStats(id).catch(() => null),
      ]);
      const s = detailRes.data as any;
      const rate = Number(s.cumulative_correct_rate) || 0;
      this.setData({
        student: {
          ...s,
          levelTitle:       getLevelTitle(s.current_level ?? 1),
          rateText:         formatRate(rate),
          registerDateText: formatDate(s.register_date, 'YYYY-MM-DD'),
          lastLoginText:    s.last_login_time ? formatDate(s.last_login_time, 'YYYY-MM-DD HH:mm') : null,
        },
      });
      if (statsRes?.data) {
        const sd = statsRes.data as any;
        this.setData({
          stats: {
            mistakesCount: sd.mistakes_count ?? 0,
          },
          dailyList: (sd.daily || []).map((row: any) => {
            const r = Number(row.daily_correct_rate) || 0;
            return {
              ...row,
              dateText:  formatDate(row.statistic_date, 'MM-DD'),
              rateText:  formatRate(r),
              barWidth:  clampPercent(r <= 1 ? r * 100 : r) + '%',
            };
          }),
        });
      }
    } catch {
      wx.navigateBack();
    } finally {
      this.setData({ loading: false });
    }
  },

  async onResetPassword() {
    wx.showModal({
      title: '重置密码',
      content: '将生成临时密码并通知学生。确认重置？',
      success: async (modal) => {
        if (!modal.confirm) return;
        this.setData({ resetting: true });
        try {
          const res = await resetStudentPassword(this.data.studentId);
          this.setData({
            tempPassword: res.data.temp_password,
            showTempPwd:  true,
          });
        } catch {
          // request.ts 已展示错误
        } finally {
          this.setData({ resetting: false });
        }
      },
    });
  },

  closeTempPwd() {
    this.setData({ showTempPwd: false });
  },

  noop() {},
});

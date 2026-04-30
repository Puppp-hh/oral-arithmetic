import * as auth from '../../../utils/auth';
import { getStatsOverview, getDailyStats } from '../../../api/student';
import { getLevelTitle, formatRate, getRateTone, formatDate, clampPercent } from '../../../utils/format';

Page({
  data: {
    loading:   true,
    overview:  null as any,
    dailyList: [] as any[],
    latestTypeStats: null as any,
  },

  onLoad() {
    if (!auth.requireStudent()) return;
    this.loadData();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [ovRes, dailyRes] = await Promise.all([
        getStatsOverview(),
        getDailyStats(7),
      ]);

      const d = ovRes.data as any;
      this.setData({
        overview: {
          ...d,
          levelTitle:          getLevelTitle(d.current_level ?? 1),
          cumulativeRateText:  formatRate(d.cumulative_correct_rate),
          recent_20_correct_rate: formatRate(d.recent_20_correct_rate),
          session_count:       d.session_count ?? 0,
        },
      });

      const daily = (dailyRes.data as any[]).map((row) => {
        const rate = Number(row.daily_correct_rate) || 0;
        return {
          ...row,
          dateText:  formatDate(row.statistic_date, 'MM-DD'),
          rateText:  formatRate(rate),
          rateTone:  getRateTone(rate),
          barWidth:  clampPercent(rate <= 1 ? rate * 100 : rate) + '%',
        };
      });
      const latest = daily.length > 0 ? daily[daily.length - 1] : null;
      this.setData({
        dailyList: daily,
        latestTypeStats: latest
          ? {
              addition_correct_rate:       latest.addition_correct_rate || '-',
              subtraction_correct_rate:    latest.subtraction_correct_rate || '-',
              multiplication_correct_rate: latest.multiplication_correct_rate || '-',
              division_correct_rate:       latest.division_correct_rate || '-',
            }
          : null,
      });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ loading: false });
    }
  },
});

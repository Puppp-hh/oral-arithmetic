/**
 * 文件说明：统计页逻辑
 * 系统作用：
 *   1. 展示总览摘要（总题数/正确率/等级/今日）
 *   2. 最近20题列表（颜色区分对错）
 *   3. 近7天每日统计柱状图（CSS 实现）
 *   4. 各运算类型正确率分析
 *
 * 调用链：onShow → 并行请求
 *   GET /api/stats/summary
 *   GET /api/stats/recent20
 *   GET /api/stats/daily?days=7
 */
const { request } = require('../../utils/request');

const LEVEL_TITLES = {
  1:'萌新', 2:'学徒', 3:'能手', 4:'达人', 5:'小侠',
  6:'高手', 7:'健将', 8:'精英', 9:'大师', 10:'传说'
};

Page({
  data: {
    summary: null,
    recent20: null,
    dailyStats: [],
    maxDailyProblems: 1,   // 用于柱状图比例
    activeTab: 'recent',   // 'recent' | 'daily' | 'type'
    loading: true,
    tabs: [
      { label: '最近20题', value: 'recent' },
      { label: '每日统计', value: 'daily' },
      { label: '类型分析', value: 'type' }
    ]
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh());
  },

  async loadAll() {
    this.setData({ loading: true });
    try {
      const [sumRes, r20Res, dailyRes] = await Promise.all([
        request({ url: '/api/stats/summary' }),
        request({ url: '/api/stats/recent20' }),
        request({ url: '/api/stats/daily?days=7' })
      ]);

      const summary   = sumRes.data;
      const recent20  = r20Res.data;
      const daily     = dailyRes.data;

      // 计算柱状图最大值（避免除零）
      const maxVal = daily.reduce(
        (m, d) => Math.max(m, d.daily_problems), 1
      );

      this.setData({
        summary: { ...summary, levelTitle: LEVEL_TITLES[summary.current_level] || '' },
        recent20,
        dailyStats: daily.map(d => ({
          ...d,
          barPct: Math.round((d.daily_problems / maxVal) * 100)
        })),
        maxDailyProblems: maxVal,
        loading: false
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  }
});

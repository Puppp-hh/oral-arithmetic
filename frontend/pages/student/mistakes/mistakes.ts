import * as auth from '../../../utils/auth';
import { getMistakes, markMistakeCorrected } from '../../../api/student';
import { formatProblemType, formatDate } from '../../../utils/format';

Page({
  data: {
    loading:   true,
    list:      [] as any[],
    total:     0,
    hasMore:   false,
    activeTab: 0,
    tabs:      [
      { label: '未掌握', count: 0 },
      { label: '已掌握', count: 0 },
    ],
    page:      1,
    pageSize:  20,
  },

  onLoad() {
    if (!auth.requireStudent()) return;
    this.loadCounts();
    this.loadList(true);
  },

  onTabChange(e: WechatMiniprogram.Touch) {
    const tab = (e.currentTarget.dataset as any).tab as number;
    this.setData({ activeTab: tab, list: [], page: 1 });
    this.loadList(true);
  },

  async loadList(reset = false) {
    const { activeTab, page, pageSize } = this.data;
    this.setData({ loading: true });
    try {
      const res = await getMistakes({
        page,
        pageSize,
        is_corrected: activeTab === 1,
      });
      const items = (res.data.list || []).map((m: any) => ({
        ...m,
        typeLabel:      formatProblemType(m.problem_type || m.problem?.problem_type),
        firstWrongText: formatDate(m.first_wrong_date, 'MM-DD'),
        correctedText:  m.corrected_date ? formatDate(m.corrected_date, 'MM-DD') : '',
      }));
      this.setData({
        list:    reset ? items : [...this.data.list, ...items],
        total:   res.data.total,
        hasMore: (page * pageSize) < res.data.total,
      });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadCounts() {
    try {
      const [unmasteredRes, masteredRes] = await Promise.all([
        getMistakes({ page: 1, pageSize: 1, is_corrected: false }),
        getMistakes({ page: 1, pageSize: 1, is_corrected: true }),
      ]);
      this.setData({
        tabs: [
          { label: '未掌握', count: unmasteredRes.data.total || 0 },
          { label: '已掌握', count: masteredRes.data.total || 0 },
        ],
      });
    } catch {
      // 列表请求会处理错误提示，这里保持页面可用
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadList(false);
    }
  },

  async onMarkCorrected(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    try {
      await markMistakeCorrected(id);
      wx.showToast({ title: '已标记掌握', icon: 'success' });
      this.setData({ list: [], page: 1 });
      this.loadCounts();
      this.loadList(true);
    } catch (err) {
      console.warn('[mistakes] mark corrected failed', err);
    }
  },

  onRedo(e: WechatMiniprogram.Touch) {
    // 重做单题：跳转训练页（不单独做题目详情页）
    wx.switchTab({ url: '/pages/student/train/train' });
  },
});

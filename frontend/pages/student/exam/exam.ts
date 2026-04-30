import * as auth from '../../../utils/auth';
import { studentGetExamList } from '../../../api/exam';
import { formatDate, formatExamStatus } from '../../../utils/format';

Page({
  data: {
    loading:   true,
    list:      [] as any[],
    total:     0,
    hasMore:   false,
    activeTab: 0,
    tabs:      ['未参加', '已参加'],
    page:      1,
    pageSize:  20,
    errorMessage: '',
  },

  onLoad() {
    if (!auth.requireStudent()) return;
    this.loadList(true);
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.setData({ list: [], page: 1 });
    this.loadList(true);
  },

  onTabChange(e: WechatMiniprogram.Touch) {
    const tab = (e.currentTarget.dataset as any).tab as number;
    this.setData({ activeTab: tab, list: [], page: 1 });
    this.loadList(true);
  },

  async loadList(reset = false) {
    const { activeTab, page, pageSize } = this.data;
    this.setData({ loading: true, errorMessage: '' });
    try {
      const statusMap: Record<number, string> = { 0: 'not_started', 1: 'submitted' };
      const res = await studentGetExamList({
        page,
        pageSize,
        status: statusMap[activeTab],
      });
      const items = (res.data.list || []).map((e: any) => ({
        ...e,
        statusLabel:    formatExamStatus(e.my_status ?? e.status),
        startTimeText:  formatDate(e.start_time, 'MM-DD HH:mm'),
        endTimeText:    formatDate(e.end_time, 'MM-DD HH:mm'),
      }));
      this.setData({
        list:    reset ? items : [...this.data.list, ...items],
        total:   res.data.total,
        hasMore: (page * pageSize) < res.data.total,
        errorMessage: '',
      });
    } catch (err) {
      this.setData({
        errorMessage: reset || this.data.list.length === 0
          ? ((err as Error).message || '考试列表加载失败')
          : '',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.setData({ list: [], page: 1 });
    this.loadList(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadList(false);
    }
  },

  goDetail(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    wx.navigateTo({ url: `/pages/student/examDetail/examDetail?id=${id}` });
  },
});

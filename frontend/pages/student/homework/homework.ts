import * as auth from '../../../utils/auth';
import { studentGetHomeworkList } from '../../../api/homework';
import { formatDate, formatHomeworkStatus } from '../../../utils/format';

Page({
  data: {
    loading:   true,
    list:      [] as any[],
    total:     0,
    hasMore:   false,
    activeTab: 0,
    tabs:      ['待完成', '已提交'],
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
    // 从详情页返回后刷新
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
      const statusMap: Record<number, string> = { 0: 'pending', 1: 'submitted' };
      const res = await studentGetHomeworkList({
        page,
        pageSize,
        status: statusMap[activeTab],
      });
      const items = (res.data.list || []).map((h: any) => ({
        ...h,
        statusLabel:  formatHomeworkStatus(h.status),
        deadlineText: formatDate(h.deadline, 'MM-DD HH:mm'),
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
          ? ((err as Error).message || '作业列表加载失败')
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
    wx.navigateTo({ url: `/pages/student/homeworkDetail/homeworkDetail?id=${id}` });
  },
});

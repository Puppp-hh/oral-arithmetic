import * as auth from '../../../utils/auth';
import { teacherGetHomeworkList } from '../../../api/homework';
import { formatDate, formatHomeworkStatus } from '../../../utils/format';

Page({
  data: {
    loading:  true,
    list:     [] as any[],
    total:    0,
    hasMore:  false,
    page:     1,
    pageSize: 20,
    errorMessage: '',
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
    this.loadList(true);
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.setData({ list: [], page: 1 });
    this.loadList(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadList(false);
    }
  },

  async loadList(reset = false) {
    this.setData({ loading: true, errorMessage: '' });
    try {
      const res = await teacherGetHomeworkList({
        page:     this.data.page,
        pageSize: this.data.pageSize,
      });
      const items = (res.data.list || []).map((h: any) => ({
        ...h,
        statusLabel:  formatHomeworkStatus(h.status),
        deadlineText: formatDate(h.deadline, 'MM-DD HH:mm'),
      }));
      this.setData({
        list:    reset ? items : [...this.data.list, ...items],
        total:   res.data.total,
        hasMore: (this.data.page * this.data.pageSize) < res.data.total,
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

  goCreate() {
    wx.navigateTo({ url: '/pages/teacher/homeworkCreate/homeworkCreate' });
  },

  goDetail(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    wx.navigateTo({ url: `/pages/teacher/homeworkDetail/homeworkDetail?id=${id}` });
  },
});

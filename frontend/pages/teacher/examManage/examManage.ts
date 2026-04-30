import * as auth from '../../../utils/auth';
import { teacherGetExamList } from '../../../api/exam';
import { formatDate } from '../../../utils/format';

const EXAM_STATUS_LABEL: Record<string, string> = {
  draft:     '草稿',
  published: '进行中',
  finished:  '已结束',
};

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
      const res = await teacherGetExamList({
        page:     this.data.page,
        pageSize: this.data.pageSize,
      });
      const items = (res.data.list || []).map((e: any) => ({
        ...e,
        statusLabel:    EXAM_STATUS_LABEL[e.status] ?? e.status,
        startTimeText:  formatDate(e.start_time, 'MM-DD HH:mm'),
        endTimeText:    formatDate(e.end_time, 'MM-DD HH:mm'),
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

  // 点击"新建考试"：先创建试卷，再关联考试
  goCreatePaper() {
    wx.navigateTo({ url: '/pages/teacher/examPaperCreate/examPaperCreate' });
  },

  goDetail(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    wx.navigateTo({ url: `/pages/teacher/examDetail/examDetail?id=${id}` });
  },
});

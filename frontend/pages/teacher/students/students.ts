import * as auth from '../../../utils/auth';
import { getStudentList } from '../../../api/teacher';
import { getLevelTitle, formatRate, getRateTone } from '../../../utils/format';

Page({
  data: {
    loading:  true,
    list:     [] as any[],
    total:    0,
    hasMore:  false,
    keyword:  '',
    page:     1,
    pageSize: 20,
    _searchTimer: null as any,
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
    this.loadList(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadList(false);
    }
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const kw = e.detail.value;
    this.setData({ keyword: kw });
    // 防抖 400ms
    if (this.data._searchTimer) clearTimeout(this.data._searchTimer);
    const t = setTimeout(() => {
      this.setData({ list: [], page: 1 });
      this.loadList(true);
    }, 400);
    this.setData({ _searchTimer: t });
  },

  async loadList(reset = false) {
    this.setData({ loading: true });
    try {
      const res = await getStudentList({
        page:     this.data.page,
        pageSize: this.data.pageSize,
        keyword:  this.data.keyword || undefined,
      });
      const items = (res.data.list || []).map((s: any) => {
        const rate = Number(s.cumulative_correct_rate) || 0;
        return {
          ...s,
          avatarText: s.name ? s.name[0] : (s.account ? s.account[0] : '?'),
          levelTitle: getLevelTitle(s.current_level ?? 1, true),
          rateText:   formatRate(rate),
          rateTone:   getRateTone(rate),
        };
      });
      this.setData({
        list:    reset ? items : [...this.data.list, ...items],
        total:   res.data.total,
        hasMore: (this.data.page * this.data.pageSize) < res.data.total,
      });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    wx.navigateTo({ url: `/pages/teacher/studentDetail/studentDetail?id=${id}` });
  },
});

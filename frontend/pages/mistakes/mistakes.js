/**
 * 文件说明：错题本页逻辑
 * 系统作用：
 *   1. 分页加载错题列表（全部/未改正/已改正）
 *   2. 标记改正 → PUT /api/mistakes/:id/corrected
 *   3. 删除错题 → DELETE /api/mistakes/:id
 *   4. 下拉刷新 / 上拉加载更多
 *
 * 调用链：onShow → GET /api/mistakes?page=&pageSize=&is_corrected=
 */
const { request } = require('../../utils/request');

// 筛选 tab
const FILTERS = [
  { label: '全部',    value: undefined },
  { label: '未改正',  value: false },
  { label: '已改正',  value: true }
];

Page({
  data: {
    filterIndex: 0,
    filters: FILTERS,
    list: [],
    page: 1,
    pageSize: 15,
    total: 0,
    hasMore: true,
    loading: false,
    refreshing: false,
    expandedId: null    // 展开的错题 ID（显示详情）
  },

  onShow() {
    this.resetAndLoad();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.resetAndLoad().then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // ── 筛选切换 ─────────────────────────────────────────────
  switchFilter(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (idx === this.data.filterIndex) return;
    this.setData({ filterIndex: idx });
    this.resetAndLoad();
  },

  // ── 加载 ─────────────────────────────────────────────────
  async resetAndLoad() {
    this.setData({ list: [], page: 1, hasMore: true });
    return this.loadList(1);
  },

  async loadMore() {
    const nextPage = this.data.page + 1;
    this.setData({ page: nextPage });
    return this.loadList(nextPage);
  },

  async loadList(page) {
    const { filterIndex, pageSize } = this.data;
    const filterVal = FILTERS[filterIndex].value;
    this.setData({ loading: true });

    let url = `/api/mistakes?page=${page}&pageSize=${pageSize}`;
    if (filterVal !== undefined) url += `&is_corrected=${filterVal}`;

    try {
      const res = await request({ url });
      const { list, total } = res.data;
      const newList = page === 1 ? list : [...this.data.list, ...list];
      this.setData({
        list: newList,
        total,
        hasMore: newList.length < total
      });
    } catch { /* 已提示 */ } finally {
      this.setData({ loading: false });
    }
  },

  // ── 展开/收起详情 ─────────────────────────────────────────
  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  },

  // ── 标记改正 ─────────────────────────────────────────────
  async onMarkCorrected(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '标记改正',
      content: '确认已经弄懂这道题了吗？',
      success: async (modal) => {
        if (!modal.confirm) return;
        try {
          await request({ url: `/api/mistakes/${id}/corrected`, method: 'PUT' });
          wx.showToast({ title: '已标记为改正', icon: 'success' });
          this.resetAndLoad();
        } catch { /* 已提示 */ }
      }
    });
  },

  // ── 删除错题 ─────────────────────────────────────────────
  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除确认',
      content: '删除后无法恢复，确认删除？',
      success: async (modal) => {
        if (!modal.confirm) return;
        try {
          await request({ url: `/api/mistakes/${id}`, method: 'DELETE' });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.resetAndLoad();
        } catch { /* 已提示 */ }
      }
    });
  }
});

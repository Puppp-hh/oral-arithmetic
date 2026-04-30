import * as auth from '../../../utils/auth';
import { getHomeworkDetail, getHomeworkCompletion } from '../../../api/homework';
import { formatDate } from '../../../utils/format';

Page({
  data: {
    loading:        true,
    homework:       null as any,
    completionData: null as any,
    filteredList:   [] as any[],
    activeTab:      0,
    tabs:           [
      { label: '全部', className: 'tab-item active', value: 0 },
      { label: '已提交', className: 'tab-item', value: 1 },
      { label: '未提交', className: 'tab-item', value: 2 },
    ],
    homeworkId:     0,
    showContent:    false,
    hasFilteredList:false,
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireTeacher()) return;
    const id = Number(options.id);
    if (!id) { wx.navigateBack(); return; }
    this.setData({ homeworkId: id });
    this.loadData(id);
  },

  async loadData(id: number) {
    this.setData({ loading: true });
    try {
      const [detailRes, completionRes] = await Promise.all([
        getHomeworkDetail(id).catch(() => null),
        getHomeworkCompletion(id).catch(() => null),
      ]);
      if (detailRes?.data) {
        const hw = detailRes.data.homework;
        this.setData({
          homework: {
            ...hw,
            deadlineText: formatDate(hw.deadline, 'MM-DD HH:mm'),
          },
        });
      }
      if (completionRes?.data) {
        const c = completionRes.data;
        const total = Number(c.total || 0);
        const submitted = Number(c.submitted || 0);
        const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
        const list = (c.list || []).map((item: any) => ({
          ...item,
          avatarText: item.student_name ? String(item.student_name).slice(0, 1) : '?',
          statusText: item.is_submitted ? '已交' : '未交',
          statusClass: item.is_submitted ? 'tag tag-success' : 'tag tag-default',
          submitStatusText: item.is_submitted && item.submitted_at
            ? `提交于 ${formatDate(item.submitted_at, 'MM-DD HH:mm')}`
            : '未提交',
          scoreText: item.is_submitted
            ? `${item.score !== undefined && item.score !== null ? item.score : '-'}分`
            : '',
          submitTimeText: item.submitted_at ? formatDate(item.submitted_at, 'MM-DD HH:mm') : null,
        }));
        this.setData({
          completionData: {
            ...c,
            list,
            submittedText: String(submitted),
            totalText: String(total),
            completionRateText: `${completionRate}%`,
            completionRateWidth: `${completionRate}%`,
          },
        });
        this.applyTab(this.data.activeTab, list);
      }
    } catch {
      wx.navigateBack();
    } finally {
      this.setData({ loading: false, showContent: !!this.data.homework });
    }
  },

  onTabChange(e: WechatMiniprogram.Touch) {
    const tab = Number((e.currentTarget.dataset as any).tab);
    this.setData({
      activeTab: tab,
      tabs: this.buildTabs(tab),
    });
    this.applyTab(tab, this.data.completionData?.list ?? []);
  },

  applyTab(tab: number, list: any[]) {
    let filtered = list;
    if (tab === 1) filtered = list.filter((i) => i.is_submitted);
    if (tab === 2) filtered = list.filter((i) => !i.is_submitted);
    this.setData({
      filteredList: filtered,
      hasFilteredList: filtered.length > 0,
    });
  },

  buildTabs(activeTab: number) {
    return this.data.tabs.map((tab: any) => ({
      ...tab,
      className: tab.value === activeTab ? 'tab-item active' : 'tab-item',
    }));
  },
});

import * as auth from '../../../utils/auth';
import { getClassStats } from '../../../api/teacher';
import { formatRate } from '../../../utils/format';

Page({
  data: {
    loading:     true,
    classStats:  null as any,
    topMistakes: [] as any[],
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
    this.loadData();
  },

  onShow() {
    if (!auth.isLoggedIn()) return;
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const res = await getClassStats();
      const d = res.data;
      this.setData({
        classStats: {
          ...d,
          avgRateText: formatRate(d.avg_correct_rate),
        },
        topMistakes: (d.top_mistakes || []).slice(0, 10),
      });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ loading: false });
    }
  },
});

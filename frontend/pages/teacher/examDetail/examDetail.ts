import * as auth from '../../../utils/auth';
import { teacherGetExamList, getExamStats } from '../../../api/exam';
import { formatDate } from '../../../utils/format';

const EXAM_STATUS_LABEL: Record<string, string> = {
  draft:     '草稿',
  published: '进行中',
  finished:  '已结束',
};

Page({
  data: {
    loading:       true,
    exam:          null as any,
    examStats:     null as any,
    studentScores: [] as any[],
    examId:        0,
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireTeacher()) return;
    const id = Number(options.id);
    if (!id) { wx.navigateBack(); return; }
    this.setData({ examId: id });
    this.loadData(id);
  },

  async loadData(id: number) {
    this.setData({ loading: true });
    try {
      // 先从列表接口获取 exam 基本信息（没有单独的 teacher exam detail 接口）
      const [listRes, statsRes] = await Promise.all([
        teacherGetExamList({ pageSize: 200 }).catch(() => null),
        getExamStats(id).catch(() => null),
      ]);
      const examBasic = listRes?.data?.list?.find((e: any) => e.exam_id === id);
      if (examBasic) {
        this.setData({
          exam: {
            ...examBasic,
            statusLabel:   EXAM_STATUS_LABEL[examBasic.status] ?? examBasic.status,
            startTimeText: formatDate(examBasic.start_time, 'MM-DD HH:mm'),
            endTimeText:   formatDate(examBasic.end_time, 'MM-DD HH:mm'),
          },
        });
      }
      if (statsRes?.data) {
        const s = statsRes.data;
        this.setData({
          examStats:     s,
          studentScores: (s.student_scores || []).sort(
            (a: any, b: any) => b.score - a.score,
          ),
        });
      }
    } catch {
      wx.navigateBack();
    } finally {
      this.setData({ loading: false });
    }
  },
});

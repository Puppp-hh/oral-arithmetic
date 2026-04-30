import * as auth from '../../../utils/auth';
import { teacherCreateExamPaper } from '../../../api/exam';

interface PaperGroup {
  operation_type:   string;
  difficulty_level: number;
  count:            number;
  score_each:       number;
}

Page({
  data: {
    paperTitle:   '',
    autoConfig: {
      groups: [
        { operation_type: 'addition', difficulty_level: 1, count: 5, score_each: 2 },
      ] as PaperGroup[],
    },
    operationTypes: [
      { label: '加法', value: 'addition' },
      { label: '减法', value: 'subtraction' },
      { label: '乘法', value: 'multiplication' },
      { label: '除法', value: 'division' },
      { label: '混合', value: 'mixed' },
    ],
    previewReady:    false,
    previewProblems: [] as any[],
    previewing:      false,
    saving:          false,
    totalCount:      5,
    totalScore:      10,
    savedPaperId:    0,
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
    this.recalcTotals();
  },

  onTitleInput(e: WechatMiniprogram.Input) {
    this.setData({ paperTitle: e.detail.value });
  },

  addGroup() {
    const groups = [...this.data.autoConfig.groups,
      { operation_type: 'addition', difficulty_level: 1, count: 5, score_each: 2 }];
    this.setData({ 'autoConfig.groups': groups });
    this.recalcTotals();
  },

  removeGroup(e: WechatMiniprogram.Touch) {
    const idx = (e.currentTarget.dataset as any).index as number;
    const groups = this.data.autoConfig.groups.filter((_, i) => i !== idx);
    this.setData({ 'autoConfig.groups': groups });
    this.recalcTotals();
  },

  onGroupTypeChange(e: WechatMiniprogram.PickerChange) {
    const idx = (e.currentTarget.dataset as any).index as number;
    const val = this.data.operationTypes[Number(e.detail.value)].value;
    this.setData({ [`autoConfig.groups[${idx}].operation_type`]: val });
  },

  onGroupFieldChange(e: WechatMiniprogram.Input) {
    const idx   = (e.currentTarget.dataset as any).index as number;
    const field = (e.currentTarget.dataset as any).field as string;
    const val   = Math.max(1, Number(e.detail.value) || 1);
    this.setData({ [`autoConfig.groups[${idx}].${field}`]: val });
    this.recalcTotals();
  },

  recalcTotals() {
    const groups = this.data.autoConfig.groups;
    const totalCount = groups.reduce((s, g) => s + Number(g.count || 0), 0);
    const totalScore = groups.reduce((s, g) => s + Number(g.count || 0) * Number(g.score_each || 0), 0);
    this.setData({ totalCount, totalScore });
  },

  async onPreview() {
    if (!this.data.paperTitle.trim()) {
      wx.showToast({ title: '请输入试卷标题', icon: 'none' }); return;
    }
    const groups = this.data.autoConfig.groups;
    if (groups.length === 0 || groups[0].count < 1) {
      wx.showToast({ title: '至少配置一组题目', icon: 'none' }); return;
    }
    // 使用第一组的配置生成预览（后端接口只支持单一 operation_type）
    const g = groups[0];
    this.setData({ previewing: true, previewReady: false });
    try {
      const res = await teacherCreateExamPaper({
        title:            this.data.paperTitle.trim(),
        problem_count:    this.data.totalCount,
        difficulty_level: g.difficulty_level,
        operation_type:   g.operation_type,
      });
      const problems = (res.data.problems || []).map((p: any, i: number) => ({
        ...p,
        score: groups[Math.min(i, groups.length - 1)]?.score_each ?? 2,
      }));
      this.setData({
        previewReady:    true,
        previewProblems: problems,
        savedPaperId:    res.data.paper_id,
      });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ previewing: false });
    }
  },

  onSavePaper() {
    if (!this.data.savedPaperId) return;
    wx.navigateTo({
      url: `/pages/teacher/examCreate/examCreate?paperId=${this.data.savedPaperId}&paperTitle=${encodeURIComponent(this.data.paperTitle)}`,
    });
  },
});

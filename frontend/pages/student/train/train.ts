import * as auth from '../../../utils/auth';
import * as studentApi from '../../../api/student';
import { formatProblemType } from '../../../utils/format';

const SESSION_ID = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const OPERATION_TYPES = [
  { label: '加法', value: 'addition', minLevel: 1 },
  { label: '减法', value: 'subtraction', minLevel: 2 },
  { label: '乘法', value: 'multiplication', minLevel: 3 },
  { label: '除法', value: 'division', minLevel: 4 },
  { label: '混合', value: 'mixed', minLevel: 5 },
];

function isTypeUnlocked(type: string, level: number): boolean {
  const item = OPERATION_TYPES.find((option) => option.value === type);
  return !!item && level >= item.minLevel;
}

Page({
  data: {
    loading:       false,
    showConfig:    true,
    sessionDone:   false,
    problems:      [] as any[],
    currentProblem: null as any,
    currentTypeLabel: '',
    progressPercent: 0,
    currentIndex:  0,
    answer:        '',
    submitted:     false,
    submitting:    false,
    isCorrect:     false,
    standardAnswer:'',
    summary:       { correct_count: 0, total: 0, correct_rate: 0 },
    config: {
      operation_type:   'addition',
      difficulty_level: 1,
      count:            10,
    },
    operationTypes: OPERATION_TYPES,
    difficultyLevels: [1, 2, 3, 4, 5],
    countOptions:     [5, 10, 15, 20, 25, 30],
    sessionId:     '',
    correctCount:  0,
  },

  onLoad() {
    if (!auth.requireStudent()) return;
  },

  onSelectType(e: WechatMiniprogram.Touch) {
    const val = (e.currentTarget.dataset as any).value;
    const minLevel = Number((e.currentTarget.dataset as any).min) || 1;
    if (this.data.config.difficulty_level < minLevel) {
      wx.showToast({ title: `Lv.${minLevel} 解锁该题型`, icon: 'none' });
      return;
    }
    this.setData({ 'config.operation_type': val });
  },

  onSelectLevel(e: WechatMiniprogram.Touch) {
    const val = (e.currentTarget.dataset as any).value;
    const nextData: Record<string, any> = { 'config.difficulty_level': val };
    if (!isTypeUnlocked(this.data.config.operation_type, val)) {
      nextData['config.operation_type'] = 'addition';
    }
    this.setData(nextData);
  },

  onSelectCount(e: WechatMiniprogram.Touch) {
    const count = Number((e.currentTarget.dataset as any).value) || 10;
    this.setData({ 'config.count': count });
  },

  async applyConfig() {
    this.setData({ loading: true, showConfig: false });
    try {
      const res = await studentApi.generateProblems({
        operation_type:   this.data.config.operation_type,
        difficulty_level: this.data.config.difficulty_level,
        count:            this.data.config.count,
      });
      const problems = res.data || [];
      if (problems.length === 0) {
        wx.showToast({ title: '未生成题目，请调整配置', icon: 'none' });
        this.setData({ showConfig: true });
        return;
      }
      this.setData({
        problems,
        currentProblem: problems[0],
        currentTypeLabel: formatProblemType(problems[0].problem_type),
        progressPercent: 0,
        currentIndex: 0,
        answer:       '',
        submitted:    false,
        sessionDone:  false,
        correctCount: 0,
        sessionId:    SESSION_ID(),
      });
    } catch {
      this.setData({ showConfig: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  onAnswerInput(e: WechatMiniprogram.Input) {
    this.setData({ answer: e.detail.value });
  },

  async onSubmitAnswer() {
    if (this.data.submitted || this.data.submitting) return;
    const { answer, problems, currentIndex, sessionId } = this.data;
    if (!problems[currentIndex]) {
      wx.showToast({ title: '题目不存在，请重新开始', icon: 'none' });
      return;
    }
    if (!answer.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' }); return;
    }
    this.setData({ submitting: true });
    try {
      const res = await studentApi.submitAnswer({
        problem_id:          problems[currentIndex].problem_id,
        answer_content:      answer.trim(),
        answer_time_seconds: 0,
        session_id:          sessionId,
      });
      const { is_correct, standard_answer } = res.data;
      this.setData({
        submitted:      true,
        isCorrect:      is_correct,
        standardAnswer: standard_answer,
        correctCount:   this.data.correctCount + (is_correct ? 1 : 0),
      });
    } catch {
      this.setData({ submitted: false });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onNextProblem() {
    const { currentIndex, problems, correctCount } = this.data;
    if (currentIndex + 1 >= problems.length) {
      const total = problems.length;
      this.setData({
        sessionDone: true,
        summary: {
          correct_count: correctCount,
          total,
          correct_rate: total > 0 ? parseFloat(((correctCount / total) * 100).toFixed(1)) : 0,
        },
      });
    } else {
      const nextIndex = currentIndex + 1;
      const nextProblem = problems[nextIndex];
      this.setData({
        currentIndex: nextIndex,
        currentProblem: nextProblem,
        currentTypeLabel: formatProblemType(nextProblem.problem_type),
        progressPercent: problems.length > 0 ? parseFloat(((nextIndex / problems.length) * 100).toFixed(1)) : 0,
        answer:       '',
        submitted:    false,
        isCorrect:    false,
        standardAnswer: '',
      });
    }
  },

  onRestartSession() {
    this.setData({ showConfig: false, sessionDone: false });
    this.applyConfig();
  },

  toggleConfig() {
    this.setData({ showConfig: !this.data.showConfig });
  },

  formatProblemType(type: string) {
    return formatProblemType(type);
  },
});

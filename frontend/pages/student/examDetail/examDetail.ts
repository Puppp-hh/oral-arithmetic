import * as auth from '../../../utils/auth';
import { getExamDetail, studentSubmitExam, getExamResult } from '../../../api/exam';

Page({
  data: {
    loading:       true,
    exam:          null as any,
    problems:      [] as any[],
    answers:       {} as Record<number, string>,
    isDone:        false,
    result:        null as any,
    examStarted:   false,
    submitting:    false,
    examId:        0,
    remainSeconds: 0,
    remainText:    '00:00',
    _timer:        null as any,
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireStudent()) return;
    const id = Number(options.id);
    if (!id) { wx.navigateBack(); return; }
    this.setData({ examId: id });
    this.loadDetail(id);
  },

  onUnload() {
    this.clearTimer();
  },

  async loadDetail(id: number) {
    this.setData({ loading: true });
    try {
      const res = await getExamDetail(id);
      const { exam, problems, my_result } = res.data;
      const isDone = !!my_result;
      this.setData({ exam, problems, isDone, result: my_result });

      if (!isDone) {
        const now      = Date.now();
        const end      = new Date(exam.end_time).getTime();
        const duration = exam.duration_minutes * 60;
        const remain   = Math.max(0, Math.min(duration, Math.floor((end - now) / 1000)));
        this.setData({ examStarted: true, remainSeconds: remain });
        this.startTimer();
      }
    } catch {
      wx.navigateBack();
    } finally {
      this.setData({ loading: false });
    }
  },

  startTimer() {
    const tick = () => {
      const left = this.data.remainSeconds - 1;
      if (left <= 0) {
        this.setData({ remainSeconds: 0, remainText: '00:00' });
        this.clearTimer();
        this.autoSubmit();
        return;
      }
      const m = String(Math.floor(left / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      this.setData({ remainSeconds: left, remainText: `${m}:${s}` });
    };
    const t = setInterval(tick, 1000);
    this.setData({ _timer: t });
  },

  clearTimer() {
    if (this.data._timer) {
      clearInterval(this.data._timer);
      this.setData({ _timer: null });
    }
  },

  onAnswerInput(e: WechatMiniprogram.Input) {
    const id = (e.currentTarget.dataset as any).id as number;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  async onSubmit() {
    wx.showModal({
      title: '确认提交',
      content: '提交后不可修改，确认？',
      success: async (res) => { if (res.confirm) await this.doSubmit(); },
    });
  },

  async autoSubmit() {
    wx.showToast({ title: '时间到，自动提交', icon: 'none' });
    await this.doSubmit();
  },

  async doSubmit() {
    const { examId, problems, answers } = this.data;
    this.setData({ submitting: true });
    this.clearTimer();
    try {
      const body = {
        answers: problems.map((p) => ({
          problem_id:          p.problem_id,
          answer_content:      answers[p.problem_id] ?? '',
          answer_time_seconds: 0,
        })),
      };
      const res = await studentSubmitExam(examId, body);
      this.setData({ isDone: true, result: res.data, examStarted: false });
      wx.showToast({ title: '提交成功', icon: 'success' });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ submitting: false });
    }
  },
});

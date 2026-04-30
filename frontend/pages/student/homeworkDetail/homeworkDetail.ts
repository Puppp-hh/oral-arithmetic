import * as auth from '../../../utils/auth';
import { getHomeworkDetail, studentSubmitHomework } from '../../../api/homework';
import { formatDate } from '../../../utils/format';

Page({
  data: {
    loading:    true,
    homework:   null as any,
    problems:   [] as any[],
    answers:    {} as Record<number, string>,
    isDone:     false,
    result:     null as any,
    submission: null as any,
    submitting: false,
    homeworkId: 0,
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireStudent()) return;
    const id = Number(options.id);
    if (!id) { wx.navigateBack(); return; }
    this.setData({ homeworkId: id });
    this.loadDetail(id);
  },

  async loadDetail(id: number) {
    this.setData({ loading: true });
    try {
      const res = await getHomeworkDetail(id);
      const { homework, problems, my_submission } = res.data;
      const isDone = !!my_submission;
      this.setData({
        homework: {
          ...homework,
          deadlineText: formatDate(homework.deadline, 'MM-DD HH:mm'),
        },
        problems,
        isDone,
        result:     isDone ? my_submission : null,
        submission: my_submission,
      });
    } catch {
      wx.navigateBack();
    } finally {
      this.setData({ loading: false });
    }
  },

  onAnswerInput(e: WechatMiniprogram.Input) {
    const id = (e.currentTarget.dataset as any).id as number;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  async onSubmit() {
    const { problems, answers, homeworkId } = this.data;
    const unanswered = problems.filter((p) => !answers[p.problem_id]);
    if (unanswered.length > 0) {
      wx.showModal({
        title: '有未作答的题目',
        content: `还有 ${unanswered.length} 道题未填写，确认提交？`,
        success: async (res) => { if (res.confirm) await this.doSubmit(problems, answers, homeworkId); },
      });
      return;
    }
    await this.doSubmit(problems, answers, homeworkId);
  },

  async doSubmit(
    problems: any[],
    answers: Record<number, string>,
    homeworkId: number,
  ) {
    this.setData({ submitting: true });
    try {
      const body = {
        answers: problems.map((p) => ({
          problem_id:          p.problem_id,
          answer_content:      answers[p.problem_id] ?? '',
          answer_time_seconds: 0,
        })),
      };
      const res = await studentSubmitHomework(homeworkId, body);
      this.setData({
        isDone:     true,
        result:     res.data,
        submission: res.data,
      });
      wx.showToast({ title: '提交成功', icon: 'success' });
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ submitting: false });
    }
  },
});

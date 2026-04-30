import * as auth from '../../../utils/auth';
import { teacherCreateExam } from '../../../api/exam';
import { getStudentList } from '../../../api/teacher';
import { getMyClasses, ClassInfo } from '../../../api/class';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: {
    paperId:    0,
    paperTitle: '',
    form: {
      title:            '',
      start_date:       today(),
      start_time:       '09:00',
      end_date:         today(),
      end_time:         '10:00',
      duration_minutes: 30,
      assign_all:       true,
    },
    classList:        [] as ClassInfo[],
    selectedClasses:  {} as Record<number, boolean>,
    studentList:      [] as any[],
    filteredStudentList: [] as any[],
    selectedStudents: {} as Record<number, boolean>,
    submitting:       false,
    minDate:          today(),
  },

  onLoad(options: Record<string, string>) {
    if (!auth.requireTeacher()) return;
    const paperId    = Number(options.paperId) || 0;
    const paperTitle = decodeURIComponent(options.paperTitle || '');
    this.setData({ paperId, paperTitle, 'form.title': paperTitle });
    this.loadInitialData();
  },

  async loadInitialData() {
    await Promise.all([this.loadClasses(), this.loadStudents()]);
  },

  async loadClasses() {
    try {
      const res = await getMyClasses();
      const classes = res.data || [];
      const selected = classes.reduce((acc, item) => {
        acc[item.class_id] = true;
        return acc;
      }, {} as Record<number, boolean>);
      this.setData({ classList: classes, selectedClasses: selected });
      this.syncFilteredStudents();
    } catch (err) {
      console.warn('[examCreate] load classes failed', err);
      wx.showToast({ title: '班级列表加载失败', icon: 'none' });
    }
  },

  async loadStudents() {
    try {
      const res = await getStudentList({ pageSize: 200 });
      this.setData({ studentList: res.data.list || [] });
      this.syncFilteredStudents();
    } catch (err) {
      console.warn('[examCreate] load students failed', err);
      wx.showToast({ title: '学生列表加载失败', icon: 'none' });
    }
  },

  onTitleInput(e: WechatMiniprogram.Input) { this.setData({ 'form.title': e.detail.value }); },
  onStartDateChange(e: WechatMiniprogram.PickerChange) { this.setData({ 'form.start_date': e.detail.value as string }); },
  onStartTimeChange(e: WechatMiniprogram.PickerChange) { this.setData({ 'form.start_time': e.detail.value as string }); },
  onEndDateChange(e: WechatMiniprogram.PickerChange)   { this.setData({ 'form.end_date': e.detail.value as string }); },
  onEndTimeChange(e: WechatMiniprogram.PickerChange)   { this.setData({ 'form.end_time': e.detail.value as string }); },
  onDurationInput(e: WechatMiniprogram.Input) {
    this.setData({ 'form.duration_minutes': Math.max(1, Number(e.detail.value) || 30) });
  },
  onToggleAssignAll(e: WechatMiniprogram.SwitchChange) {
    this.setData({ 'form.assign_all': e.detail.value, selectedStudents: {} });
  },
  onToggleClass(e: WechatMiniprogram.Touch) {
    const id = Number((e.currentTarget.dataset as any).id);
    const selectedClasses = { ...this.data.selectedClasses };
    selectedClasses[id] ? delete selectedClasses[id] : (selectedClasses[id] = true);

    const selectedClassIds = Object.keys(selectedClasses).map(Number);
    const selectedStudents = { ...this.data.selectedStudents };
    Object.keys(selectedStudents).forEach((sid) => {
      const student = this.data.studentList.find((item) => Number(item.student_id) === Number(sid));
      if (student && !selectedClassIds.includes(Number(student.class_id))) {
        delete selectedStudents[Number(sid)];
      }
    });

    this.setData({ selectedClasses, selectedStudents });
    this.syncFilteredStudents();
  },
  onToggleStudent(e: WechatMiniprogram.Touch) {
    const id = (e.currentTarget.dataset as any).id as number;
    const sel = { ...this.data.selectedStudents };
    sel[id] ? delete sel[id] : (sel[id] = true);
    this.setData({ selectedStudents: sel });
  },

  async onSubmit() {
    const { form, paperId, selectedStudents } = this.data;
    const classIds = Object.keys(this.data.selectedClasses).map(Number);
    if (!form.title.trim()) {
      wx.showToast({ title: '请输入考试名称', icon: 'none' }); return;
    }
    if (!paperId) {
      wx.showToast({ title: '试卷信息缺失，请返回重新创建', icon: 'none' }); return;
    }
    if (this.data.classList.length > 0 && classIds.length === 0) {
      wx.showToast({ title: '请选择班级', icon: 'none' }); return;
    }
    this.setData({ submitting: true });
    try {
      const body: any = {
        paper_id:         paperId,
        title:            form.title.trim(),
        start_time:       `${form.start_date} ${form.start_time}:00`,
        end_time:         `${form.end_date} ${form.end_time}:00`,
        duration_minutes: form.duration_minutes,
        assign_all:       form.assign_all,
        class_ids:        classIds,
      };
      if (!form.assign_all) {
        body.student_ids = Object.keys(selectedStudents).map(Number);
        if (body.student_ids.length === 0) {
          wx.showToast({ title: '请选择学生', icon: 'none' });
          this.setData({ submitting: false });
          return;
        }
      }
      await teacherCreateExam(body);
      wx.showToast({ title: '考试发布成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/teacher/examManage/examManage' });
      }, 1200);
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ submitting: false });
    }
  },

  syncFilteredStudents() {
    const classIds = Object.keys(this.data.selectedClasses).map(Number);
    const filteredStudentList = classIds.length === 0
      ? []
      : this.data.studentList.filter((item) => classIds.includes(Number(item.class_id)));
    this.setData({ filteredStudentList });
  },
});

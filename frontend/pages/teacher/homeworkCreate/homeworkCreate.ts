import * as auth from '../../../utils/auth';
import { teacherCreateHomework } from '../../../api/homework';
import { getStudentList } from '../../../api/teacher';
import { getMyClasses, ClassInfo } from '../../../api/class';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: {
    form: {
      title:            '',
      operation_type:   'addition',
      difficulty_level: 1,
      problem_count:    10,
      deadline:         '',
      assign_all:       true,
    },
    operationTypes: [
      { label: '加法', value: 'addition' },
      { label: '减法', value: 'subtraction' },
      { label: '乘法', value: 'multiplication' },
      { label: '除法', value: 'division' },
      { label: '混合', value: 'mixed' },
    ],
    difficultyLevels: [
      { label: 'Lv.1', value: 1 }, { label: 'Lv.2', value: 2 },
      { label: 'Lv.3', value: 3 }, { label: 'Lv.4', value: 4 },
      { label: 'Lv.5', value: 5 },
    ],
    countOptions:     [5, 10, 15, 20, 30],
    studentList:      [] as any[],
    filteredStudentList: [] as any[],
    classList:        [] as ClassInfo[],
    selectedClasses:  {} as Record<number, boolean>,
    selectedStudents: {} as Record<number, boolean>,
    submitting:       false,
    minDate:          today(),
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
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
      console.warn('[homeworkCreate] load classes failed', err);
      wx.showToast({ title: '班级列表加载失败', icon: 'none' });
    }
  },

  async loadStudents() {
    try {
      const res = await getStudentList({ pageSize: 200 });
      this.setData({ studentList: res.data.list || [] });
      this.syncFilteredStudents();
    } catch (err) {
      console.warn('[homeworkCreate] load students failed', err);
      wx.showToast({ title: '学生列表加载失败', icon: 'none' });
    }
  },

  onTitleInput(e: WechatMiniprogram.Input)    { this.setData({ 'form.title': e.detail.value }); },
  onSelectType(e: WechatMiniprogram.Touch)    { this.setData({ 'form.operation_type': (e.currentTarget.dataset as any).value }); },
  onSelectLevel(e: WechatMiniprogram.Touch)   { this.setData({ 'form.difficulty_level': (e.currentTarget.dataset as any).value }); },
  onSelectCount(e: WechatMiniprogram.Touch)   { this.setData({ 'form.problem_count': (e.currentTarget.dataset as any).value }); },
  onDeadlineChange(e: WechatMiniprogram.PickerChange) { this.setData({ 'form.deadline': e.detail.value as string }); },
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
    const selected = { ...this.data.selectedStudents };
    selected[id] ? delete selected[id] : (selected[id] = true);
    this.setData({ selectedStudents: selected });
  },

  async onSubmit() {
    const { form, selectedStudents } = this.data;
    const classIds = Object.keys(this.data.selectedClasses).map(Number);
    if (!form.title.trim()) {
      wx.showToast({ title: '请输入作业标题', icon: 'none' }); return;
    }
    if (!form.deadline) {
      wx.showToast({ title: '请选择截止日期', icon: 'none' }); return;
    }
    if (this.data.classList.length > 0 && classIds.length === 0) {
      wx.showToast({ title: '请选择班级', icon: 'none' }); return;
    }
    this.setData({ submitting: true });
    try {
      const body: any = {
        title:            form.title.trim(),
        operation_type:   form.operation_type,
        difficulty_level: form.difficulty_level,
        problem_count:    form.problem_count,
        deadline:         form.deadline + ' 23:59:59',
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
      await teacherCreateHomework(body);
      wx.showToast({ title: '布置成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
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

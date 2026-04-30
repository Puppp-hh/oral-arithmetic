"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const auth = __importStar(require("../../../utils/auth"));
const exam_1 = require("../../../api/exam");
const teacher_1 = require("../../../api/teacher");
const class_1 = require("../../../api/class");
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
Page({
    data: {
        paperId: 0,
        paperTitle: '',
        form: {
            title: '',
            start_date: today(),
            start_time: '09:00',
            end_date: today(),
            end_time: '10:00',
            duration_minutes: 30,
            assign_all: true,
        },
        classList: [],
        selectedClasses: {},
        studentList: [],
        filteredStudentList: [],
        selectedStudents: {},
        submitting: false,
        minDate: today(),
    },
    onLoad(options) {
        if (!auth.requireTeacher())
            return;
        const paperId = Number(options.paperId) || 0;
        const paperTitle = decodeURIComponent(options.paperTitle || '');
        this.setData({ paperId, paperTitle, 'form.title': paperTitle });
        this.loadInitialData();
    },
    async loadInitialData() {
        await Promise.all([this.loadClasses(), this.loadStudents()]);
    },
    async loadClasses() {
        try {
            const res = await (0, class_1.getMyClasses)();
            const classes = res.data || [];
            const selected = classes.reduce((acc, item) => {
                acc[item.class_id] = true;
                return acc;
            }, {});
            this.setData({ classList: classes, selectedClasses: selected });
            this.syncFilteredStudents();
        }
        catch (err) {
            console.warn('[examCreate] load classes failed', err);
            wx.showToast({ title: '班级列表加载失败', icon: 'none' });
        }
    },
    async loadStudents() {
        try {
            const res = await (0, teacher_1.getStudentList)({ pageSize: 200 });
            this.setData({ studentList: res.data.list || [] });
            this.syncFilteredStudents();
        }
        catch (err) {
            console.warn('[examCreate] load students failed', err);
            wx.showToast({ title: '学生列表加载失败', icon: 'none' });
        }
    },
    onTitleInput(e) { this.setData({ 'form.title': e.detail.value }); },
    onStartDateChange(e) { this.setData({ 'form.start_date': e.detail.value }); },
    onStartTimeChange(e) { this.setData({ 'form.start_time': e.detail.value }); },
    onEndDateChange(e) { this.setData({ 'form.end_date': e.detail.value }); },
    onEndTimeChange(e) { this.setData({ 'form.end_time': e.detail.value }); },
    onDurationInput(e) {
        this.setData({ 'form.duration_minutes': Math.max(1, Number(e.detail.value) || 30) });
    },
    onToggleAssignAll(e) {
        this.setData({ 'form.assign_all': e.detail.value, selectedStudents: {} });
    },
    onToggleClass(e) {
        const id = Number(e.currentTarget.dataset.id);
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
    onToggleStudent(e) {
        const id = e.currentTarget.dataset.id;
        const sel = { ...this.data.selectedStudents };
        sel[id] ? delete sel[id] : (sel[id] = true);
        this.setData({ selectedStudents: sel });
    },
    async onSubmit() {
        const { form, paperId, selectedStudents } = this.data;
        const classIds = Object.keys(this.data.selectedClasses).map(Number);
        if (!form.title.trim()) {
            wx.showToast({ title: '请输入考试名称', icon: 'none' });
            return;
        }
        if (!paperId) {
            wx.showToast({ title: '试卷信息缺失，请返回重新创建', icon: 'none' });
            return;
        }
        if (this.data.classList.length > 0 && classIds.length === 0) {
            wx.showToast({ title: '请选择班级', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            const body = {
                paper_id: paperId,
                title: form.title.trim(),
                start_time: `${form.start_date} ${form.start_time}:00`,
                end_time: `${form.end_date} ${form.end_time}:00`,
                duration_minutes: form.duration_minutes,
                assign_all: form.assign_all,
                class_ids: classIds,
            };
            if (!form.assign_all) {
                body.student_ids = Object.keys(selectedStudents).map(Number);
                if (body.student_ids.length === 0) {
                    wx.showToast({ title: '请选择学生', icon: 'none' });
                    this.setData({ submitting: false });
                    return;
                }
            }
            await (0, exam_1.teacherCreateExam)(body);
            wx.showToast({ title: '考试发布成功', icon: 'success' });
            setTimeout(() => {
                wx.redirectTo({ url: '/pages/teacher/examManage/examManage' });
            }, 1200);
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
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

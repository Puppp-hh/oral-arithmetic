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
const homework_1 = require("../../../api/homework");
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        homework: null,
        problems: [],
        answers: {},
        isDone: false,
        result: null,
        submission: null,
        submitting: false,
        homeworkId: 0,
    },
    onLoad(options) {
        if (!auth.requireStudent())
            return;
        const id = Number(options.id);
        if (!id) {
            wx.navigateBack();
            return;
        }
        this.setData({ homeworkId: id });
        this.loadDetail(id);
    },
    async loadDetail(id) {
        this.setData({ loading: true });
        try {
            const res = await (0, homework_1.getHomeworkDetail)(id);
            const { homework, problems, my_submission } = res.data;
            const isDone = !!my_submission;
            this.setData({
                homework: {
                    ...homework,
                    deadlineText: (0, format_1.formatDate)(homework.deadline, 'MM-DD HH:mm'),
                },
                problems,
                isDone,
                result: isDone ? my_submission : null,
                submission: my_submission,
            });
        }
        catch {
            wx.navigateBack();
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onAnswerInput(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ [`answers.${id}`]: e.detail.value });
    },
    async onSubmit() {
        const { problems, answers, homeworkId } = this.data;
        const unanswered = problems.filter((p) => !answers[p.problem_id]);
        if (unanswered.length > 0) {
            wx.showModal({
                title: '有未作答的题目',
                content: `还有 ${unanswered.length} 道题未填写，确认提交？`,
                success: async (res) => { if (res.confirm)
                    await this.doSubmit(problems, answers, homeworkId); },
            });
            return;
        }
        await this.doSubmit(problems, answers, homeworkId);
    },
    async doSubmit(problems, answers, homeworkId) {
        this.setData({ submitting: true });
        try {
            const body = {
                answers: problems.map((p) => ({
                    problem_id: p.problem_id,
                    answer_content: answers[p.problem_id] ?? '',
                    answer_time_seconds: 0,
                })),
            };
            const res = await (0, homework_1.studentSubmitHomework)(homeworkId, body);
            this.setData({
                isDone: true,
                result: res.data,
                submission: res.data,
            });
            wx.showToast({ title: '提交成功', icon: 'success' });
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});

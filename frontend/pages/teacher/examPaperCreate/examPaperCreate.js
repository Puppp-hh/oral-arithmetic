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
Page({
    data: {
        paperTitle: '',
        autoConfig: {
            groups: [
                { operation_type: 'addition', difficulty_level: 1, count: 5, score_each: 2 },
            ],
        },
        operationTypes: [
            { label: '加法', value: 'addition' },
            { label: '减法', value: 'subtraction' },
            { label: '乘法', value: 'multiplication' },
            { label: '除法', value: 'division' },
            { label: '混合', value: 'mixed' },
        ],
        previewReady: false,
        previewProblems: [],
        previewing: false,
        saving: false,
        totalCount: 5,
        totalScore: 10,
        savedPaperId: 0,
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
        this.recalcTotals();
    },
    onTitleInput(e) {
        this.setData({ paperTitle: e.detail.value });
    },
    addGroup() {
        const groups = [...this.data.autoConfig.groups,
            { operation_type: 'addition', difficulty_level: 1, count: 5, score_each: 2 }];
        this.setData({ 'autoConfig.groups': groups });
        this.recalcTotals();
    },
    removeGroup(e) {
        const idx = e.currentTarget.dataset.index;
        const groups = this.data.autoConfig.groups.filter((_, i) => i !== idx);
        this.setData({ 'autoConfig.groups': groups });
        this.recalcTotals();
    },
    onGroupTypeChange(e) {
        const idx = e.currentTarget.dataset.index;
        const val = this.data.operationTypes[Number(e.detail.value)].value;
        this.setData({ [`autoConfig.groups[${idx}].operation_type`]: val });
    },
    onGroupFieldChange(e) {
        const idx = e.currentTarget.dataset.index;
        const field = e.currentTarget.dataset.field;
        const val = Math.max(1, Number(e.detail.value) || 1);
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
            wx.showToast({ title: '请输入试卷标题', icon: 'none' });
            return;
        }
        const groups = this.data.autoConfig.groups;
        if (groups.length === 0 || groups[0].count < 1) {
            wx.showToast({ title: '至少配置一组题目', icon: 'none' });
            return;
        }
        // 使用第一组的配置生成预览（后端接口只支持单一 operation_type）
        const g = groups[0];
        this.setData({ previewing: true, previewReady: false });
        try {
            const res = await (0, exam_1.teacherCreateExamPaper)({
                title: this.data.paperTitle.trim(),
                problem_count: this.data.totalCount,
                difficulty_level: g.difficulty_level,
                operation_type: g.operation_type,
            });
            const problems = (res.data.problems || []).map((p, i) => ({
                ...p,
                score: groups[Math.min(i, groups.length - 1)]?.score_each ?? 2,
            }));
            this.setData({
                previewReady: true,
                previewProblems: problems,
                savedPaperId: res.data.paper_id,
            });
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
            this.setData({ previewing: false });
        }
    },
    onSavePaper() {
        if (!this.data.savedPaperId)
            return;
        wx.navigateTo({
            url: `/pages/teacher/examCreate/examCreate?paperId=${this.data.savedPaperId}&paperTitle=${encodeURIComponent(this.data.paperTitle)}`,
        });
    },
});

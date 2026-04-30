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
const student_1 = require("../../../api/student");
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        list: [],
        total: 0,
        hasMore: false,
        activeTab: 0,
        tabs: [
            { label: '未掌握', count: 0 },
            { label: '已掌握', count: 0 },
        ],
        page: 1,
        pageSize: 20,
    },
    onLoad() {
        if (!auth.requireStudent())
            return;
        this.loadCounts();
        this.loadList(true);
    },
    onTabChange(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab, list: [], page: 1 });
        this.loadList(true);
    },
    async loadList(reset = false) {
        const { activeTab, page, pageSize } = this.data;
        this.setData({ loading: true });
        try {
            const res = await (0, student_1.getMistakes)({
                page,
                pageSize,
                is_corrected: activeTab === 1,
            });
            const items = (res.data.list || []).map((m) => ({
                ...m,
                typeLabel: (0, format_1.formatProblemType)(m.problem_type || m.problem?.problem_type),
                firstWrongText: (0, format_1.formatDate)(m.first_wrong_date, 'MM-DD'),
                correctedText: m.corrected_date ? (0, format_1.formatDate)(m.corrected_date, 'MM-DD') : '',
            }));
            this.setData({
                list: reset ? items : [...this.data.list, ...items],
                total: res.data.total,
                hasMore: (page * pageSize) < res.data.total,
            });
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadCounts() {
        try {
            const [unmasteredRes, masteredRes] = await Promise.all([
                (0, student_1.getMistakes)({ page: 1, pageSize: 1, is_corrected: false }),
                (0, student_1.getMistakes)({ page: 1, pageSize: 1, is_corrected: true }),
            ]);
            this.setData({
                tabs: [
                    { label: '未掌握', count: unmasteredRes.data.total || 0 },
                    { label: '已掌握', count: masteredRes.data.total || 0 },
                ],
            });
        }
        catch {
            // 列表请求会处理错误提示，这里保持页面可用
        }
    },
    onReachBottom() {
        if (this.data.hasMore && !this.data.loading) {
            this.setData({ page: this.data.page + 1 });
            this.loadList(false);
        }
    },
    async onMarkCorrected(e) {
        const id = e.currentTarget.dataset.id;
        try {
            await (0, student_1.markMistakeCorrected)(id);
            wx.showToast({ title: '已标记掌握', icon: 'success' });
            this.setData({ list: [], page: 1 });
            this.loadCounts();
            this.loadList(true);
        }
        catch (err) {
            console.warn('[mistakes] mark corrected failed', err);
        }
    },
    onRedo(e) {
        // 重做单题：跳转训练页（不单独做题目详情页）
        wx.switchTab({ url: '/pages/student/train/train' });
    },
});

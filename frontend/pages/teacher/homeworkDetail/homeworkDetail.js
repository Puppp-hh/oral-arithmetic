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
        completionData: null,
        filteredList: [],
        activeTab: 0,
        tabs: [
            { label: '全部', className: 'tab-item active', value: 0 },
            { label: '已提交', className: 'tab-item', value: 1 },
            { label: '未提交', className: 'tab-item', value: 2 },
        ],
        homeworkId: 0,
        showContent: false,
        hasFilteredList: false,
    },
    onLoad(options) {
        if (!auth.requireTeacher())
            return;
        const id = Number(options.id);
        if (!id) {
            wx.navigateBack();
            return;
        }
        this.setData({ homeworkId: id });
        this.loadData(id);
    },
    async loadData(id) {
        this.setData({ loading: true });
        try {
            const [detailRes, completionRes] = await Promise.all([
                (0, homework_1.getHomeworkDetail)(id).catch(() => null),
                (0, homework_1.getHomeworkCompletion)(id).catch(() => null),
            ]);
            if (detailRes?.data) {
                const hw = detailRes.data.homework;
                this.setData({
                    homework: {
                        ...hw,
                        deadlineText: (0, format_1.formatDate)(hw.deadline, 'MM-DD HH:mm'),
                    },
                });
            }
            if (completionRes?.data) {
                const c = completionRes.data;
                const total = Number(c.total || 0);
                const submitted = Number(c.submitted || 0);
                const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
                const list = (c.list || []).map((item) => ({
                    ...item,
                    avatarText: item.student_name ? String(item.student_name).slice(0, 1) : '?',
                    statusText: item.is_submitted ? '已交' : '未交',
                    statusClass: item.is_submitted ? 'tag tag-success' : 'tag tag-default',
                    submitStatusText: item.is_submitted && item.submitted_at
                        ? `提交于 ${(0, format_1.formatDate)(item.submitted_at, 'MM-DD HH:mm')}`
                        : '未提交',
                    scoreText: item.is_submitted
                        ? `${item.score !== undefined && item.score !== null ? item.score : '-'}分`
                        : '',
                    submitTimeText: item.submitted_at ? (0, format_1.formatDate)(item.submitted_at, 'MM-DD HH:mm') : null,
                }));
                this.setData({
                    completionData: {
                        ...c,
                        list,
                        submittedText: String(submitted),
                        totalText: String(total),
                        completionRateText: `${completionRate}%`,
                        completionRateWidth: `${completionRate}%`,
                    },
                });
                this.applyTab(this.data.activeTab, list);
            }
        }
        catch {
            wx.navigateBack();
        }
        finally {
            this.setData({ loading: false, showContent: !!this.data.homework });
        }
    },
    onTabChange(e) {
        const tab = Number(e.currentTarget.dataset.tab);
        this.setData({
            activeTab: tab,
            tabs: this.buildTabs(tab),
        });
        this.applyTab(tab, this.data.completionData?.list ?? []);
    },
    applyTab(tab, list) {
        let filtered = list;
        if (tab === 1)
            filtered = list.filter((i) => i.is_submitted);
        if (tab === 2)
            filtered = list.filter((i) => !i.is_submitted);
        this.setData({
            filteredList: filtered,
            hasFilteredList: filtered.length > 0,
        });
    },
    buildTabs(activeTab) {
        return this.data.tabs.map((tab) => ({
            ...tab,
            className: tab.value === activeTab ? 'tab-item active' : 'tab-item',
        }));
    },
});

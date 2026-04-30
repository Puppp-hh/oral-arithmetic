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
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        list: [],
        total: 0,
        hasMore: false,
        activeTab: 0,
        tabs: ['未参加', '已参加'],
        page: 1,
        pageSize: 20,
        errorMessage: '',
    },
    onLoad() {
        if (!auth.requireStudent())
            return;
        this.loadList(true);
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.setData({ list: [], page: 1 });
        this.loadList(true);
    },
    onTabChange(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab, list: [], page: 1 });
        this.loadList(true);
    },
    async loadList(reset = false) {
        const { activeTab, page, pageSize } = this.data;
        this.setData({ loading: true, errorMessage: '' });
        try {
            const statusMap = { 0: 'not_started', 1: 'submitted' };
            const res = await (0, exam_1.studentGetExamList)({
                page,
                pageSize,
                status: statusMap[activeTab],
            });
            const items = (res.data.list || []).map((e) => ({
                ...e,
                statusLabel: (0, format_1.formatExamStatus)(e.my_status ?? e.status),
                startTimeText: (0, format_1.formatDate)(e.start_time, 'MM-DD HH:mm'),
                endTimeText: (0, format_1.formatDate)(e.end_time, 'MM-DD HH:mm'),
            }));
            this.setData({
                list: reset ? items : [...this.data.list, ...items],
                total: res.data.total,
                hasMore: (page * pageSize) < res.data.total,
                errorMessage: '',
            });
        }
        catch (err) {
            this.setData({
                errorMessage: reset || this.data.list.length === 0
                    ? (err.message || '考试列表加载失败')
                    : '',
            });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onRetry() {
        this.setData({ list: [], page: 1 });
        this.loadList(true);
    },
    onReachBottom() {
        if (this.data.hasMore && !this.data.loading) {
            this.setData({ page: this.data.page + 1 });
            this.loadList(false);
        }
    },
    goDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/student/examDetail/examDetail?id=${id}` });
    },
});

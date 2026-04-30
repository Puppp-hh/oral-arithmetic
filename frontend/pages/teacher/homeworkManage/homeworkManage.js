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
        list: [],
        total: 0,
        hasMore: false,
        page: 1,
        pageSize: 20,
        errorMessage: '',
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
        this.loadList(true);
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.setData({ list: [], page: 1 });
        this.loadList(true);
    },
    onReachBottom() {
        if (this.data.hasMore && !this.data.loading) {
            this.setData({ page: this.data.page + 1 });
            this.loadList(false);
        }
    },
    async loadList(reset = false) {
        this.setData({ loading: true, errorMessage: '' });
        try {
            const res = await (0, homework_1.teacherGetHomeworkList)({
                page: this.data.page,
                pageSize: this.data.pageSize,
            });
            const items = (res.data.list || []).map((h) => ({
                ...h,
                statusLabel: (0, format_1.formatHomeworkStatus)(h.status),
                deadlineText: (0, format_1.formatDate)(h.deadline, 'MM-DD HH:mm'),
            }));
            this.setData({
                list: reset ? items : [...this.data.list, ...items],
                total: res.data.total,
                hasMore: (this.data.page * this.data.pageSize) < res.data.total,
                errorMessage: '',
            });
        }
        catch (err) {
            this.setData({
                errorMessage: reset || this.data.list.length === 0
                    ? (err.message || '作业列表加载失败')
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
    goCreate() {
        wx.navigateTo({ url: '/pages/teacher/homeworkCreate/homeworkCreate' });
    },
    goDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/teacher/homeworkDetail/homeworkDetail?id=${id}` });
    },
});

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
const studentApi = __importStar(require("../../../api/student"));
const homework_1 = require("../../../api/homework");
const exam_1 = require("../../../api/exam");
const format_1 = require("../../../utils/format");
Page({
    data: {
        userInfo: null,
        levelInfo: { current_level: 1, level_title: '口算萌新' },
        statsOverview: {},
        pendingHomeworkCount: 0,
        pendingExamCount: 0,
        todayDate: '',
    },
    onLoad() {
        if (!auth.requireStudent())
            return;
        this.setData({
            userInfo: auth.getUserInfo(),
            todayDate: (0, format_1.formatDate)(new Date(), 'MM月DD日'),
        });
        this.loadData();
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.loadData();
    },
    async loadData() {
        try {
            const [statsRes, hwRes, examRes] = await Promise.all([
                studentApi.getStatsOverview().catch(() => null),
                (0, homework_1.studentGetHomeworkList)({ pageSize: 50 }).catch(() => null),
                (0, exam_1.studentGetExamList)({ pageSize: 50 }).catch(() => null),
            ]);
            if (statsRes?.data) {
                const d = statsRes.data;
                this.setData({
                    statsOverview: {
                        today_problems: d.today_problems ?? 0,
                        today_correct_rate: typeof d.today_correct_rate === 'number'
                            ? d.today_correct_rate.toFixed(1) + '%'
                            : (d.today_correct_rate ?? '0%'),
                        total_problems: d.total_problems ?? 0,
                    },
                    levelInfo: {
                        current_level: d.current_level ?? 1,
                        level_title: (0, format_1.getLevelTitle)(d.current_level ?? 1),
                    },
                });
            }
            if (hwRes?.data?.list) {
                const pending = hwRes.data.list.filter((h) => h.my_status === 'pending' || h.status === 'pending' || h.status === 'not_submitted').length;
                this.setData({ pendingHomeworkCount: pending });
            }
            if (examRes?.data?.list) {
                const pending = examRes.data.list.filter((e) => e.my_status === 'pending' || e.my_status === 'not_started' || e.my_status === 'in_progress').length;
                this.setData({ pendingExamCount: pending });
            }
        }
        catch (err) {
            console.warn('[studentHome] load dashboard failed', err);
        }
    },
    onLogout() {
        wx.showModal({
            title: '退出登录',
            content: '确认退出？',
            success: (res) => {
                if (res.confirm)
                    auth.redirectToLogin();
            },
        });
    },
    goTrain() { wx.switchTab({ url: '/pages/student/train/train' }); },
    goHomework() { wx.navigateTo({ url: '/pages/student/homework/homework' }); },
    goExam() { wx.navigateTo({ url: '/pages/student/exam/exam' }); },
    goMistakes() { wx.switchTab({ url: '/pages/student/mistakes/mistakes' }); },
    goStats() { wx.switchTab({ url: '/pages/student/stats/stats' }); },
    goResetPwd() { wx.navigateTo({ url: '/pages/student/resetPassword/resetPassword' }); },
});

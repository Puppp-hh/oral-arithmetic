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
const teacher_1 = require("../../../api/teacher");
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        student: null,
        stats: null,
        dailyList: [],
        resetting: false,
        showTempPwd: false,
        tempPassword: '',
        studentId: 0,
    },
    onLoad(options) {
        if (!auth.requireTeacher())
            return;
        const id = Number(options.id);
        if (!id) {
            wx.navigateBack();
            return;
        }
        this.setData({ studentId: id });
        this.loadData(id);
    },
    async loadData(id) {
        this.setData({ loading: true });
        try {
            const [detailRes, statsRes] = await Promise.all([
                (0, teacher_1.getStudentDetail)(id),
                (0, teacher_1.getStudentStats)(id).catch(() => null),
            ]);
            const s = detailRes.data;
            const rate = Number(s.cumulative_correct_rate) || 0;
            this.setData({
                student: {
                    ...s,
                    levelTitle: (0, format_1.getLevelTitle)(s.current_level ?? 1),
                    rateText: (0, format_1.formatRate)(rate),
                    registerDateText: (0, format_1.formatDate)(s.register_date, 'YYYY-MM-DD'),
                    lastLoginText: s.last_login_time ? (0, format_1.formatDate)(s.last_login_time, 'YYYY-MM-DD HH:mm') : null,
                },
            });
            if (statsRes?.data) {
                const sd = statsRes.data;
                this.setData({
                    stats: {
                        mistakesCount: sd.mistakes_count ?? 0,
                    },
                    dailyList: (sd.daily || []).map((row) => {
                        const r = Number(row.daily_correct_rate) || 0;
                        return {
                            ...row,
                            dateText: (0, format_1.formatDate)(row.statistic_date, 'MM-DD'),
                            rateText: (0, format_1.formatRate)(r),
                            barWidth: (0, format_1.clampPercent)(r <= 1 ? r * 100 : r) + '%',
                        };
                    }),
                });
            }
        }
        catch {
            wx.navigateBack();
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async onResetPassword() {
        wx.showModal({
            title: '重置密码',
            content: '将生成临时密码并通知学生。确认重置？',
            success: async (modal) => {
                if (!modal.confirm)
                    return;
                this.setData({ resetting: true });
                try {
                    const res = await (0, teacher_1.resetStudentPassword)(this.data.studentId);
                    this.setData({
                        tempPassword: res.data.temp_password,
                        showTempPwd: true,
                    });
                }
                catch {
                    // request.ts 已展示错误
                }
                finally {
                    this.setData({ resetting: false });
                }
            },
        });
    },
    closeTempPwd() {
        this.setData({ showTempPwd: false });
    },
    noop() { },
});

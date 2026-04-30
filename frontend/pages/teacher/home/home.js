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
const class_1 = require("../../../api/class");
const format_1 = require("../../../utils/format");
Page({
    data: {
        teacherInfo: null,
        classStats: {},
        classList: [],
        classNames: [],
        selectedClassIndex: 0,
        inviteInfo: null,
        inviteLoaded: false,
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
        this.setData({ teacherInfo: auth.getUserInfo() });
        this.loadData();
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.loadData();
    },
    async loadData() {
        try {
            const [infoRes, classRes] = await Promise.all([
                (0, teacher_1.getTeacherInfo)().catch(() => null),
                (0, class_1.getMyClasses)().catch(() => null),
            ]);
            if (infoRes?.data) {
                this.setData({ teacherInfo: infoRes.data });
            }
            const classes = classRes?.data ?? [];
            const selectedIndex = Math.min(this.data.selectedClassIndex, Math.max(0, classes.length - 1));
            this.setData({
                classList: classes,
                classNames: classes.map((item) => item.class_name),
                selectedClassIndex: selectedIndex,
                inviteInfo: classes[selectedIndex] ?? null,
                inviteLoaded: true,
            });
            await this.loadClassStats(classes[selectedIndex]?.class_id);
        }
        catch (err) {
            console.warn('[teacherHome] load dashboard failed', err);
            this.setData({ inviteLoaded: true });
        }
    },
    async loadClassStats(classId) {
        const statsRes = await (0, teacher_1.getClassStats)({ classId }).catch(() => null);
        if (statsRes?.data) {
            const d = statsRes.data;
            this.setData({
                classStats: { ...d, avgRateText: (0, format_1.formatRate)(d.avg_correct_rate) },
            });
        }
    },
    onClassPickerChange(e) {
        const index = Number(e.detail.value);
        this.setData({
            selectedClassIndex: index,
            inviteInfo: this.data.classList[index] ?? null,
        });
        this.loadClassStats(this.data.classList[index]?.class_id);
    },
    onCopyCode() {
        const code = this.data.inviteInfo?.invite_code;
        if (!code)
            return;
        wx.setClipboardData({
            data: code,
            success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
        });
    },
    goCreateClass() {
        wx.navigateTo({ url: '/pages/teacher/classCreate/classCreate' });
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
    goClassManage() { wx.navigateTo({ url: '/pages/teacher/classManage/classManage' }); },
    goStudents() { wx.navigateTo({ url: '/pages/teacher/students/students' }); },
    goHomeworkManage() { wx.navigateTo({ url: '/pages/teacher/homeworkManage/homeworkManage' }); },
    goExamManage() { wx.navigateTo({ url: '/pages/teacher/examManage/examManage' }); },
    goStats() { wx.navigateTo({ url: '/pages/teacher/stats/stats' }); },
});

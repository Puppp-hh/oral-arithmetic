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
const class_1 = require("../../../api/class");
Page({
    data: {
        classId: 0,
        codeInfo: {},
        students: [],
        total: 0,
        loadingStudents: false,
    },
    onLoad(options) {
        if (!auth.requireTeacher())
            return;
        const classId = Number(options.classId);
        if (!classId) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        this.setData({ classId });
        this.loadAll(classId);
    },
    async loadAll(classId) {
        this.setData({ loadingStudents: true });
        const [codeRes, studentsRes] = await Promise.allSettled([
            (0, class_1.getClassInviteCode)(classId),
            (0, class_1.getClassStudents)(classId),
        ]);
        if (codeRes.status === 'fulfilled' && codeRes.value.data) {
            this.setData({ codeInfo: codeRes.value.data });
        }
        if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
            const d = studentsRes.value.data;
            this.setData({
                students: d.list ?? [],
                total: d.total ?? 0,
            });
        }
        this.setData({ loadingStudents: false });
    },
    onCopy() {
        const code = this.data.codeInfo.invite_code;
        if (!code)
            return;
        wx.setClipboardData({
            data: code,
            success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
        });
    },
    onRefresh() {
        wx.showModal({
            title: '重置邀请码',
            content: '重置后旧邀请码不能再用于新学生加入；已绑定学生不受影响。确认重置？',
            confirmColor: '#f5222d',
            success: async (res) => {
                if (!res.confirm)
                    return;
                try {
                    const r = await (0, class_1.refreshClassInviteCode)(this.data.classId);
                    if (r.data) {
                        this.setData({ 'codeInfo.invite_code': r.data.invite_code });
                        wx.showToast({ title: '邀请码已重置', icon: 'success' });
                    }
                }
                catch (err) {
                    console.warn('[inviteCode] refresh invite code failed', err);
                }
            },
        });
    },
});

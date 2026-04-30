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
        list: [],
        loading: false,
        deleteDialog: {
            visible: false,
            classId: 0,
            className: '',
        },
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.loadClasses();
    },
    async loadClasses() {
        this.setData({ loading: true });
        try {
            const res = await (0, class_1.getMyClasses)();
            this.setData({ list: res.data ?? [] });
        }
        catch {
            // 错误已在 request.ts 中展示
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goCreate() {
        wx.navigateTo({ url: '/pages/teacher/classCreate/classCreate' });
    },
    goInviteCode(e) {
        const classId = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/teacher/inviteCode/inviteCode?classId=${classId}` });
    },
    onDeleteClass(e) {
        const dataset = e.currentTarget.dataset;
        const classId = Number(dataset.id);
        const studentCount = Number(dataset.count || 0);
        const className = dataset.name || '该班级';
        if (studentCount > 0) {
            wx.showToast({ title: '班级内有学生，不能删除', icon: 'none' });
            return;
        }
        this.setData({
            deleteDialog: {
                visible: true,
                classId,
                className,
            },
        });
    },
    onCancelDelete() {
        this.setData({ 'deleteDialog.visible': false });
    },
    async onConfirmDelete() {
        const { classId } = this.data.deleteDialog;
        if (!classId)
            return;
        try {
            await (0, class_1.deleteClass)(classId);
            wx.showToast({ title: '已删除', icon: 'success' });
            this.setData({ 'deleteDialog.visible': false });
            this.loadClasses();
        }
        catch {
            // request.ts 已展示错误
        }
    },
});

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
const teacherApi = __importStar(require("../../../api/teacher"));
const auth = __importStar(require("../../../utils/auth"));
Page({
    data: {
        account: '',
        password: '',
        loading: false,
    },
    onLoad() {
        if (auth.isLoggedIn() && auth.isTeacher()) {
            wx.reLaunch({ url: '/pages/teacher/home/home' });
        }
        else if (auth.isLoggedIn() && auth.isStudent()) {
            wx.reLaunch({ url: '/pages/student/home/home' });
        }
    },
    onAccountInput(e) {
        this.setData({ account: e.detail.value });
    },
    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },
    async onLogin() {
        const { account, password } = this.data;
        if (!account.trim()) {
            wx.showToast({ title: '请输入账号', icon: 'none' });
            return;
        }
        if (!password) {
            wx.showToast({ title: '请输入密码', icon: 'none' });
            return;
        }
        this.setData({ loading: true });
        try {
            const res = await teacherApi.login(account.trim(), password);
            auth.saveLogin(res.data.token, res.data.userInfo, 'teacher');
            wx.reLaunch({ url: '/pages/teacher/home/home' });
        }
        catch {
            // 错误已在 request.ts 中展示
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goStudentLogin() {
        wx.reLaunch({ url: '/pages/student/login/login' });
    },
    goRegister() {
        wx.navigateTo({ url: '/pages/teacher/register/register' });
    },
});

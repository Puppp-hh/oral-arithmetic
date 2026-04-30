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
        inviteCode: '',
        loading: false,
        currentClass: '',
    },
    onLoad() {
        if (!auth.requireStudent())
            return;
        const userInfo = auth.getUserInfo();
        if (userInfo && userInfo.class_id) {
            this.setData({ currentClass: `班级 ID ${userInfo.class_id}` });
        }
    },
    onInput(e) {
        this.setData({ inviteCode: e.detail.value.toUpperCase() });
    },
    async onSubmit() {
        const code = this.data.inviteCode.trim();
        if (!code) {
            wx.showToast({ title: '请输入邀请码', icon: 'none' });
            return;
        }
        if (code.length < 4) {
            wx.showToast({ title: '邀请码格式不正确', icon: 'none' });
            return;
        }
        this.setData({ loading: true });
        try {
            const res = await (0, class_1.bindInviteCode)(code);
            if (res.data) {
                auth.saveLogin(auth.getToken(), res.data, 'student');
            }
            wx.showToast({ title: '更换成功', icon: 'success', duration: 1500 });
            setTimeout(() => wx.navigateBack({ delta: 1 }), 1500);
        }
        catch {
            // 错误已在 request.ts 中展示
        }
        finally {
            this.setData({ loading: false });
        }
    },
});

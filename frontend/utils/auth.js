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
exports.saveLogin = saveLogin;
exports.getToken = getToken;
exports.getUserInfo = getUserInfo;
exports.getRole = getRole;
exports.isLoggedIn = isLoggedIn;
exports.isStudent = isStudent;
exports.isTeacher = isTeacher;
exports.clearLogin = clearLogin;
exports.redirectToLogin = redirectToLogin;
exports.redirectToHome = redirectToHome;
exports.requireStudent = requireStudent;
exports.requireTeacher = requireTeacher;
const storage = __importStar(require("./storage"));
const role_1 = require("../constants/role");
function app() {
    return getApp();
}
// ── 写入 ──────────────────────────────────────────────────────────
function saveLogin(token, userInfo, role) {
    storage.set(storage.KEYS.TOKEN, token);
    storage.set(storage.KEYS.USER_INFO, userInfo);
    storage.set(storage.KEYS.ROLE, role);
    const g = app().globalData;
    g.token = token;
    g.userInfo = userInfo;
    g.role = role;
}
// ── 读取 ──────────────────────────────────────────────────────────
function getToken() {
    return app().globalData.token || storage.get(storage.KEYS.TOKEN) || '';
}
function getUserInfo() {
    return app().globalData.userInfo
        ?? storage.get(storage.KEYS.USER_INFO);
}
function getRole() {
    return app().globalData.role
        || storage.get(storage.KEYS.ROLE)
        || '';
}
// ── 判断 ──────────────────────────────────────────────────────────
function isLoggedIn() {
    return !!getToken();
}
function isStudent() {
    return getRole() === role_1.ROLE.STUDENT;
}
function isTeacher() {
    return getRole() === role_1.ROLE.TEACHER;
}
// ── 清除 ──────────────────────────────────────────────────────────
function clearLogin() {
    const g = app().globalData;
    g.token = '';
    g.userInfo = null;
    g.role = '';
    storage.remove(storage.KEYS.TOKEN);
    storage.remove(storage.KEYS.USER_INFO);
    storage.remove(storage.KEYS.ROLE);
}
// ── 跳转 ──────────────────────────────────────────────────────────
function redirectToLogin() {
    const role = getRole();
    clearLogin();
    wx.reLaunch({ url: role_1.ROLE_LOGIN[role] || role_1.ROLE_LOGIN.student });
}
function redirectToHome(role) {
    wx.reLaunch({ url: role_1.ROLE_HOME[role] || role_1.ROLE_HOME.student });
}
// ── 页面守卫 ──────────────────────────────────────────────────────
/**
 * 在 onLoad 最开头调用。非学生立即跳走，返回 false 表示被拦截。
 *
 * 示例：
 *   onLoad() {
 *     if (!requireStudent()) return;
 *     ...
 *   }
 */
function requireStudent() {
    if (!isLoggedIn()) {
        wx.reLaunch({ url: role_1.ROLE_LOGIN.student });
        return false;
    }
    if (!isStudent()) {
        wx.showToast({ title: '无权限访问学生页面', icon: 'none' });
        wx.reLaunch({ url: role_1.ROLE_LOGIN.student });
        return false;
    }
    return true;
}
function requireTeacher() {
    if (!isLoggedIn()) {
        wx.reLaunch({ url: role_1.ROLE_LOGIN.teacher });
        return false;
    }
    if (!isTeacher()) {
        wx.showToast({ title: '无权限访问教师页面', icon: 'none' });
        wx.reLaunch({ url: role_1.ROLE_LOGIN.teacher });
        return false;
    }
    return true;
}

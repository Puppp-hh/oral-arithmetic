"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYS = void 0;
exports.set = set;
exports.get = get;
exports.remove = remove;
exports.clear = clear;
exports.KEYS = {
    TOKEN: 'token',
    USER_INFO: 'userInfo',
    ROLE: 'role',
};
function set(key, value) {
    wx.setStorageSync(key, value);
}
function get(key) {
    const val = wx.getStorageSync(key);
    return (val === '' || val === undefined || val === null) ? null : val;
}
function remove(key) {
    wx.removeStorageSync(key);
}
function clear() {
    wx.clearStorageSync();
}

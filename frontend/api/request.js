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
exports.request = request;
const api_1 = require("../constants/api");
const auth = __importStar(require("../utils/auth"));
function request(options) {
    return new Promise((resolve, reject) => {
        const token = auth.getToken();
        const header = { 'Content-Type': 'application/json' };
        if (!options.noToken && token) {
            header['Authorization'] = `Bearer ${token}`;
        }
        wx.request({
            url: api_1.BASE_URL + options.url,
            method: options.method ?? 'GET',
            data: options.data ?? {},
            header,
            success(res) {
                const body = res.data;
                const statusCode = res.statusCode;
                const code = body?.code;
                if (code === 200 || code === 201) {
                    resolve(body);
                    return;
                }
                if ((code === 401 || statusCode === 401) && !options.noToken) {
                    wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
                    setTimeout(() => auth.redirectToLogin(), 1500);
                    reject(new Error('登录已过期'));
                    return;
                }
                const msg = getErrorMessage(body, statusCode);
                if (!options.silent) {
                    wx.showToast({ title: msg, icon: 'none', duration: 2500 });
                }
                reject(new Error(msg));
            },
            fail(err) {
                console.error('[request] 网络错误', options.url, err);
                wx.showToast({ title: '网络连接失败，请检查服务器', icon: 'none', duration: 2500 });
                reject(new Error('网络请求失败'));
            },
        });
    });
}
function getErrorMessage(body, statusCode) {
    const errors = body?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0 && errors[0].message) {
        return errors[0].message;
    }
    return body?.message ?? `请求失败（${statusCode}）`;
}

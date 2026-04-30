"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_CONFIG = void 0;
exports.getApiBaseUrl = getApiBaseUrl;
const API_BASE_URLS = {
    develop: 'http://127.0.0.1:3000',
    trial: 'https://your-api-domain.example.com',
    release: 'https://your-api-domain.example.com',
};
function getMiniProgramEnv() {
    try {
        const envVersion = wx.getAccountInfoSync?.().miniProgram?.envVersion;
        if (envVersion === 'trial' || envVersion === 'release')
            return envVersion;
    }
    catch {
        // 开发工具或单测环境可能没有 wx 上下文，默认走本地开发地址。
    }
    return 'develop';
}
function getApiBaseUrl() {
    return API_BASE_URLS[getMiniProgramEnv()];
}
exports.ENV_CONFIG = {
    API_BASE_URLS,
};

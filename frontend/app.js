"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./utils/storage");
App({
    globalData: {
        token: '',
        userInfo: null,
        role: '',
    },
    onLaunch() {
        const token = (0, storage_1.get)(storage_1.KEYS.TOKEN) || '';
        const userInfo = (0, storage_1.get)(storage_1.KEYS.USER_INFO) || null;
        const role = (0, storage_1.get)(storage_1.KEYS.ROLE) || '';
        if (token) {
            this.globalData.token = token;
            this.globalData.userInfo = userInfo;
            this.globalData.role = role;
        }
    },
});

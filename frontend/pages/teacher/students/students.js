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
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        list: [],
        total: 0,
        hasMore: false,
        keyword: '',
        page: 1,
        pageSize: 20,
        _searchTimer: null,
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
        this.loadList(true);
    },
    onReachBottom() {
        if (this.data.hasMore && !this.data.loading) {
            this.setData({ page: this.data.page + 1 });
            this.loadList(false);
        }
    },
    onSearchInput(e) {
        const kw = e.detail.value;
        this.setData({ keyword: kw });
        // 防抖 400ms
        if (this.data._searchTimer)
            clearTimeout(this.data._searchTimer);
        const t = setTimeout(() => {
            this.setData({ list: [], page: 1 });
            this.loadList(true);
        }, 400);
        this.setData({ _searchTimer: t });
    },
    async loadList(reset = false) {
        this.setData({ loading: true });
        try {
            const res = await (0, teacher_1.getStudentList)({
                page: this.data.page,
                pageSize: this.data.pageSize,
                keyword: this.data.keyword || undefined,
            });
            const items = (res.data.list || []).map((s) => {
                const rate = Number(s.cumulative_correct_rate) || 0;
                return {
                    ...s,
                    avatarText: s.name ? s.name[0] : (s.account ? s.account[0] : '?'),
                    levelTitle: (0, format_1.getLevelTitle)(s.current_level ?? 1, true),
                    rateText: (0, format_1.formatRate)(rate),
                    rateTone: (0, format_1.getRateTone)(rate),
                };
            });
            this.setData({
                list: reset ? items : [...this.data.list, ...items],
                total: res.data.total,
                hasMore: (this.data.page * this.data.pageSize) < res.data.total,
            });
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/teacher/studentDetail/studentDetail?id=${id}` });
    },
});

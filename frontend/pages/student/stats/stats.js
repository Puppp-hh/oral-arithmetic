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
const student_1 = require("../../../api/student");
const format_1 = require("../../../utils/format");
Page({
    data: {
        loading: true,
        overview: null,
        dailyList: [],
        latestTypeStats: null,
    },
    onLoad() {
        if (!auth.requireStudent())
            return;
        this.loadData();
    },
    onShow() {
        if (!auth.isLoggedIn())
            return;
        this.loadData();
    },
    async loadData() {
        this.setData({ loading: true });
        try {
            const [ovRes, dailyRes] = await Promise.all([
                (0, student_1.getStatsOverview)(),
                (0, student_1.getDailyStats)(7),
            ]);
            const d = ovRes.data;
            this.setData({
                overview: {
                    ...d,
                    levelTitle: (0, format_1.getLevelTitle)(d.current_level ?? 1),
                    cumulativeRateText: (0, format_1.formatRate)(d.cumulative_correct_rate),
                    recent_20_correct_rate: (0, format_1.formatRate)(d.recent_20_correct_rate),
                    session_count: d.session_count ?? 0,
                },
            });
            const daily = dailyRes.data.map((row) => {
                const rate = Number(row.daily_correct_rate) || 0;
                return {
                    ...row,
                    dateText: (0, format_1.formatDate)(row.statistic_date, 'MM-DD'),
                    rateText: (0, format_1.formatRate)(rate),
                    rateTone: (0, format_1.getRateTone)(rate),
                    barWidth: (0, format_1.clampPercent)(rate <= 1 ? rate * 100 : rate) + '%',
                };
            });
            const latest = daily.length > 0 ? daily[daily.length - 1] : null;
            this.setData({
                dailyList: daily,
                latestTypeStats: latest
                    ? {
                        addition_correct_rate: latest.addition_correct_rate || '-',
                        subtraction_correct_rate: latest.subtraction_correct_rate || '-',
                        multiplication_correct_rate: latest.multiplication_correct_rate || '-',
                        division_correct_rate: latest.division_correct_rate || '-',
                    }
                    : null,
            });
        }
        catch {
            // request.ts 已展示错误
        }
        finally {
            this.setData({ loading: false });
        }
    },
});

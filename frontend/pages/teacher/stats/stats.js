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
        classStats: null,
        topMistakes: [],
    },
    onLoad() {
        if (!auth.requireTeacher())
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
            const res = await (0, teacher_1.getClassStats)();
            const d = res.data;
            this.setData({
                classStats: {
                    ...d,
                    avgRateText: (0, format_1.formatRate)(d.avg_correct_rate),
                },
                topMistakes: (d.top_mistakes || []).slice(0, 10),
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

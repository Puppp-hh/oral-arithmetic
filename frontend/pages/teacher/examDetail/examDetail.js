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
const exam_1 = require("../../../api/exam");
const format_1 = require("../../../utils/format");
const EXAM_STATUS_LABEL = {
    draft: '草稿',
    published: '进行中',
    finished: '已结束',
};
Page({
    data: {
        loading: true,
        exam: null,
        examStats: null,
        studentScores: [],
        examId: 0,
    },
    onLoad(options) {
        if (!auth.requireTeacher())
            return;
        const id = Number(options.id);
        if (!id) {
            wx.navigateBack();
            return;
        }
        this.setData({ examId: id });
        this.loadData(id);
    },
    async loadData(id) {
        this.setData({ loading: true });
        try {
            // 先从列表接口获取 exam 基本信息（没有单独的 teacher exam detail 接口）
            const [listRes, statsRes] = await Promise.all([
                (0, exam_1.teacherGetExamList)({ pageSize: 200 }).catch(() => null),
                (0, exam_1.getExamStats)(id).catch(() => null),
            ]);
            const examBasic = listRes?.data?.list?.find((e) => e.exam_id === id);
            if (examBasic) {
                this.setData({
                    exam: {
                        ...examBasic,
                        statusLabel: EXAM_STATUS_LABEL[examBasic.status] ?? examBasic.status,
                        startTimeText: (0, format_1.formatDate)(examBasic.start_time, 'MM-DD HH:mm'),
                        endTimeText: (0, format_1.formatDate)(examBasic.end_time, 'MM-DD HH:mm'),
                    },
                });
            }
            if (statsRes?.data) {
                const s = statsRes.data;
                this.setData({
                    examStats: s,
                    studentScores: (s.student_scores || []).sort((a, b) => b.score - a.score),
                });
            }
        }
        catch {
            wx.navigateBack();
        }
        finally {
            this.setData({ loading: false });
        }
    },
});

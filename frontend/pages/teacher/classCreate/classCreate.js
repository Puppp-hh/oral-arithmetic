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
const GRADES = [
    { id: 1, name: '一年级' },
    { id: 2, name: '二年级' },
    { id: 3, name: '三年级' },
    { id: 4, name: '四年级' },
    { id: 5, name: '五年级' },
    { id: 6, name: '六年级' },
];
const CLASS_NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}班`);
Page({
    data: {
        gradeNames: GRADES.map(g => g.name),
        classNumbers: CLASS_NUMBERS,
        selectedGradeIndex: 0,
        selectedClassIndex: 0,
        loading: false,
    },
    onLoad() {
        if (!auth.requireTeacher())
            return;
    },
    onGradeChange(e) {
        this.setData({ selectedGradeIndex: Number(e.detail.value) });
    },
    onClassNoChange(e) {
        this.setData({ selectedClassIndex: Number(e.detail.value) });
    },
    async onSubmit() {
        const { selectedGradeIndex, selectedClassIndex } = this.data;
        const gradeId = GRADES[selectedGradeIndex].id;
        const className = `${GRADES[selectedGradeIndex].name}${CLASS_NUMBERS[selectedClassIndex]}`;
        this.setData({ loading: true });
        try {
            const res = await (0, class_1.createClass)({ className, gradeId });
            wx.showToast({ title: '创建成功', icon: 'success', duration: 1200 });
            setTimeout(() => {
                // 跳转到邀请码页查看新班级邀请码
                wx.redirectTo({
                    url: `/pages/teacher/inviteCode/inviteCode?classId=${res.data.class_id}`,
                });
            }, 1200);
        }
        catch {
            // 错误已在 request.ts 中展示
        }
        finally {
            this.setData({ loading: false });
        }
    },
});

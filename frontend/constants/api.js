"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = exports.BASE_URL = void 0;
const env_1 = require("./env");
exports.BASE_URL = (0, env_1.getApiBaseUrl)();
exports.API = {
    // ── 认证 ────────────────────────────────────────────────────────
    STUDENT_LOGIN: '/api/auth/student/login',
    STUDENT_REGISTER: '/api/auth/student/register',
    TEACHER_LOGIN: '/api/auth/teacher/login',
    TEACHER_REGISTER: '/api/auth/teacher/register',
    LOGOUT: '/api/auth/logout',
    REFRESH_TOKEN: '/api/auth/refresh',
    // ── 学生信息 ─────────────────────────────────────────────────────
    STUDENT_INFO: '/api/student/info',
    STUDENT_LEVEL: '/api/student/level',
    STUDENT_BIND_INVITE_CODE: '/api/student/bind-invite-code',
    STUDENT_RESET_PASSWORD: '/api/student/reset-password',
    // ── 题目 / 训练 ──────────────────────────────────────────────────
    PROBLEM_GENERATE: '/api/problems/generate',
    PROBLEM_SUBMIT: '/api/problems/submit',
    PROBLEM_BY_ID: '/api/problems/:id',
    // ── 错题本 ───────────────────────────────────────────────────────
    MISTAKES_LIST: '/api/mistakes',
    // 后端：PUT /api/mistakes/:id/corrected
    MISTAKE_MARK_CORRECTED: '/api/mistakes/:id/corrected',
    // ── 学习统计 ─────────────────────────────────────────────────────
    // 后端：GET /api/stats/summary
    STATS_OVERVIEW: '/api/stats/summary',
    STATS_DAILY: '/api/stats/daily',
    STATS_RECENT20: '/api/stats/recent20',
    // ── 老师信息 ─────────────────────────────────────────────────────
    TEACHER_INFO: '/api/teacher/info',
    TEACHER_CLASS_STATS: '/api/teacher/stats',
    TEACHER_MY_INVITE_CODE: '/api/teacher/my-invite-code',
    // ── 老师管理学生 ─────────────────────────────────────────────────
    TEACHER_STUDENTS: '/api/teacher/students',
    TEACHER_STUDENT_DETAIL: '/api/teacher/students/:id',
    TEACHER_STUDENT_STATS: '/api/teacher/students/:id/stats',
    TEACHER_STUDENT_RESET_PWD: '/api/teacher/students/:id/reset-password',
    // ── 班级管理 ─────────────────────────────────────────────────────
    TEACHER_CLASSES: '/api/teacher/classes',
    TEACHER_CLASS_DETAIL: '/api/teacher/classes/:id',
    TEACHER_CLASS_INVITE_CODE: '/api/teacher/classes/:id/invite-code',
    TEACHER_CLASS_STUDENTS: '/api/teacher/classes/:id/students',
    // ── 地图 / 学校搜索 ───────────────────────────────────────────────
    MAP_SCHOOL_SEARCH: '/api/map/school/search',
    MAP_REVERSE_GEOCODE: '/api/map/reverse-geocode',
    // ── 家庭作业 ─────────────────────────────────────────────────────
    HOMEWORK_CREATE: '/api/homework',
    HOMEWORK_TEACHER_LIST: '/api/homework/teacher',
    HOMEWORK_STUDENT_LIST: '/api/homework/student',
    HOMEWORK_DETAIL: '/api/homework/:id',
    HOMEWORK_SUBMIT: '/api/homework/:id/submit',
    HOMEWORK_COMPLETION: '/api/homework/:id/completion',
    // ── 考试 ─────────────────────────────────────────────────────────
    EXAM_PAPER_CREATE: '/api/exam/paper',
    EXAM_PAPER_DETAIL: '/api/exam/paper/:id',
    EXAM_CREATE: '/api/exam',
    EXAM_PUBLISH: '/api/exam/:id/publish',
    EXAM_TEACHER_LIST: '/api/exam/teacher',
    EXAM_STUDENT_LIST: '/api/exam/student',
    EXAM_DETAIL: '/api/exam/:id',
    EXAM_SUBMIT: '/api/exam/:id/submit',
    EXAM_RESULT: '/api/exam/:id/result',
    EXAM_STATS: '/api/exam/:id/stats',
};

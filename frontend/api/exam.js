"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherCreateExamPaper = teacherCreateExamPaper;
exports.getExamPaperDetail = getExamPaperDetail;
exports.teacherCreateExam = teacherCreateExam;
exports.teacherGetExamList = teacherGetExamList;
exports.getExamStats = getExamStats;
exports.studentGetExamList = studentGetExamList;
exports.getExamDetail = getExamDetail;
exports.studentSubmitExam = studentSubmitExam;
exports.getExamResult = getExamResult;
const request_1 = require("./request");
const api_1 = require("../constants/api");
// ── 老师端 ────────────────────────────────────────────────────────
function teacherCreateExamPaper(body) {
    return (0, request_1.request)({ url: api_1.API.EXAM_PAPER_CREATE, method: 'POST', data: body });
}
function getExamPaperDetail(paperId) {
    return (0, request_1.request)({ url: api_1.API.EXAM_PAPER_DETAIL.replace(':id', String(paperId)) });
}
function teacherCreateExam(body) {
    return (0, request_1.request)({ url: api_1.API.EXAM_CREATE, method: 'POST', data: body });
}
function teacherGetExamList(params = {}) {
    return (0, request_1.request)({ url: api_1.API.EXAM_TEACHER_LIST, data: params });
}
function getExamStats(examId) {
    return (0, request_1.request)({ url: api_1.API.EXAM_STATS.replace(':id', String(examId)) });
}
// ── 学生端 ────────────────────────────────────────────────────────
function studentGetExamList(params = {}) {
    return (0, request_1.request)({ url: api_1.API.EXAM_STUDENT_LIST, data: params });
}
function getExamDetail(examId) {
    return (0, request_1.request)({ url: api_1.API.EXAM_DETAIL.replace(':id', String(examId)) });
}
function studentSubmitExam(examId, body) {
    return (0, request_1.request)({
        url: api_1.API.EXAM_SUBMIT.replace(':id', String(examId)),
        method: 'POST',
        data: body,
    });
}
function getExamResult(examId) {
    return (0, request_1.request)({ url: api_1.API.EXAM_RESULT.replace(':id', String(examId)) });
}

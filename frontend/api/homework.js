"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherCreateHomework = teacherCreateHomework;
exports.teacherGetHomeworkList = teacherGetHomeworkList;
exports.getHomeworkCompletion = getHomeworkCompletion;
exports.studentGetHomeworkList = studentGetHomeworkList;
exports.getHomeworkDetail = getHomeworkDetail;
exports.studentSubmitHomework = studentSubmitHomework;
const request_1 = require("./request");
const api_1 = require("../constants/api");
// ── 老师端 ────────────────────────────────────────────────────────
function teacherCreateHomework(body) {
    return (0, request_1.request)({ url: api_1.API.HOMEWORK_CREATE, method: 'POST', data: body });
}
function teacherGetHomeworkList(params = {}) {
    return (0, request_1.request)({ url: api_1.API.HOMEWORK_TEACHER_LIST, data: params });
}
function getHomeworkCompletion(homeworkId) {
    return (0, request_1.request)({ url: api_1.API.HOMEWORK_COMPLETION.replace(':id', String(homeworkId)) });
}
// ── 学生端 ────────────────────────────────────────────────────────
function studentGetHomeworkList(params = {}) {
    return (0, request_1.request)({ url: api_1.API.HOMEWORK_STUDENT_LIST, data: params });
}
function getHomeworkDetail(homeworkId) {
    return (0, request_1.request)({ url: api_1.API.HOMEWORK_DETAIL.replace(':id', String(homeworkId)) });
}
function studentSubmitHomework(homeworkId, body) {
    return (0, request_1.request)({
        url: api_1.API.HOMEWORK_SUBMIT.replace(':id', String(homeworkId)),
        method: 'POST',
        data: body,
    });
}

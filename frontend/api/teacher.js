"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getTeacherInfo = getTeacherInfo;
exports.getStudentList = getStudentList;
exports.getStudentDetail = getStudentDetail;
exports.getStudentStats = getStudentStats;
exports.resetStudentPassword = resetStudentPassword;
exports.getClassStats = getClassStats;
const request_1 = require("./request");
const api_1 = require("../constants/api");
function login(account, password) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_LOGIN,
        method: 'POST',
        data: { account, password },
        noToken: true,
    });
}
function getTeacherInfo() {
    return (0, request_1.request)({ url: api_1.API.TEACHER_INFO });
}
function getStudentList(params = {}) {
    return (0, request_1.request)({ url: api_1.API.TEACHER_STUDENTS, data: params });
}
function getStudentDetail(studentId) {
    return (0, request_1.request)({ url: api_1.API.TEACHER_STUDENT_DETAIL.replace(':id', String(studentId)) });
}
function getStudentStats(studentId) {
    return (0, request_1.request)({ url: api_1.API.TEACHER_STUDENT_STATS.replace(':id', String(studentId)) });
}
/**
 * 重置学生密码，返回临时密码。
 * 页面展示时必须提示：请通知学生尽快修改密码。
 */
function resetStudentPassword(studentId) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_STUDENT_RESET_PWD.replace(':id', String(studentId)),
        method: 'POST',
    });
}
function getClassStats(params = {}) {
    return (0, request_1.request)({ url: api_1.API.TEACHER_CLASS_STATS, data: params });
}

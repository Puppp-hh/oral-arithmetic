"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getStudentInfo = getStudentInfo;
exports.getStudentLevel = getStudentLevel;
exports.generateProblems = generateProblems;
exports.submitAnswer = submitAnswer;
exports.resetPassword = resetPassword;
exports.getMistakes = getMistakes;
exports.markMistakeCorrected = markMistakeCorrected;
exports.getStatsOverview = getStatsOverview;
exports.getDailyStats = getDailyStats;
const request_1 = require("./request");
const api_1 = require("../constants/api");
function login(account, password) {
    return (0, request_1.request)({
        url: api_1.API.STUDENT_LOGIN,
        method: 'POST',
        data: { account, password },
        noToken: true,
    });
}
function getStudentInfo() {
    return (0, request_1.request)({ url: api_1.API.STUDENT_INFO });
}
function getStudentLevel() {
    return (0, request_1.request)({ url: api_1.API.STUDENT_LEVEL });
}
function generateProblems(params = {}) {
    return (0, request_1.request)({
        url: api_1.API.PROBLEM_GENERATE,
        data: params,
    }).then((res) => ({
        ...res,
        data: Array.isArray(res.data) ? res.data : (res.data?.problems ?? []),
    }));
}
function submitAnswer(body) {
    return (0, request_1.request)({ url: api_1.API.PROBLEM_SUBMIT, method: 'POST', data: body });
}
function resetPassword(data) {
    return (0, request_1.request)({
        url: api_1.API.STUDENT_RESET_PASSWORD,
        method: 'POST',
        data,
    });
}
function getMistakes(params = {}) {
    return (0, request_1.request)({ url: api_1.API.MISTAKES_LIST, data: params });
}
// 后端：PUT /api/mistakes/:id/corrected
function markMistakeCorrected(mistakeId) {
    return (0, request_1.request)({
        url: api_1.API.MISTAKE_MARK_CORRECTED.replace(':id', String(mistakeId)),
        method: 'PUT',
    });
}
// 后端：GET /api/stats/summary  返回 Summary 结构
function getStatsOverview() {
    return (0, request_1.request)({ url: api_1.API.STATS_OVERVIEW });
}
// 后端接受 days 参数（整数），例如 days=7
function getDailyStats(days = 7) {
    return (0, request_1.request)({ url: api_1.API.STATS_DAILY, data: { days } });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentRegister = studentRegister;
exports.teacherRegister = teacherRegister;
const request_1 = require("./request");
const api_1 = require("../constants/api");
function studentRegister(data) {
    return (0, request_1.request)({
        url: api_1.API.STUDENT_REGISTER,
        method: 'POST',
        data,
        noToken: true,
    });
}
function teacherRegister(data) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_REGISTER,
        method: 'POST',
        data,
        noToken: true,
    });
}

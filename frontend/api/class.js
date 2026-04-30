"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyInviteCode = getMyInviteCode;
exports.getMyClasses = getMyClasses;
exports.createClass = createClass;
exports.deleteClass = deleteClass;
exports.getClassInviteCode = getClassInviteCode;
exports.refreshClassInviteCode = refreshClassInviteCode;
exports.getClassStudents = getClassStudents;
exports.bindInviteCode = bindInviteCode;
const request_1 = require("./request");
const api_1 = require("../constants/api");
function getMyInviteCode() {
    return (0, request_1.request)({ url: api_1.API.TEACHER_MY_INVITE_CODE });
}
function getMyClasses() {
    return (0, request_1.request)({ url: api_1.API.TEACHER_CLASSES });
}
function createClass(data) {
    return (0, request_1.request)({ url: api_1.API.TEACHER_CLASSES, method: 'POST', data });
}
function deleteClass(classId) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_CLASS_DETAIL.replace(':id', String(classId)),
        method: 'DELETE',
    });
}
function getClassInviteCode(classId) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_CLASS_INVITE_CODE.replace(':id', String(classId)),
    });
}
function refreshClassInviteCode(classId) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_CLASS_INVITE_CODE.replace(':id', String(classId)),
        method: 'PUT',
    });
}
function getClassStudents(classId) {
    return (0, request_1.request)({
        url: api_1.API.TEACHER_CLASS_STUDENTS.replace(':id', String(classId)),
    });
}
function bindInviteCode(inviteCode) {
    return (0, request_1.request)({
        url: api_1.API.STUDENT_BIND_INVITE_CODE,
        method: 'POST',
        data: { inviteCode },
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLevelTitle = getLevelTitle;
exports.getLevelDesc = getLevelDesc;
exports.formatProblemType = formatProblemType;
exports.formatRate = formatRate;
exports.getRateTone = getRateTone;
exports.formatDate = formatDate;
exports.formatDuration = formatDuration;
exports.formatHomeworkStatus = formatHomeworkStatus;
exports.formatExamStatus = formatExamStatus;
exports.getAvatarText = getAvatarText;
exports.clampPercent = clampPercent;
const LEVEL_TITLES = {
    1: '口算萌新', 2: '数字学徒', 3: '加减能手', 4: '运算达人', 5: '乘除小侠',
    6: '混合高手', 7: '速算健将', 8: '数学精英', 9: '口算大师', 10: '传说天才',
};
const SHORT_LEVEL_TITLES = {
    1: '萌新', 2: '学徒', 3: '能手', 4: '达人', 5: '小侠',
    6: '高手', 7: '健将', 8: '精英', 9: '大师', 10: '传说',
};
const PROBLEM_TYPE_LABELS = {
    addition: '加法', subtraction: '减法', multiplication: '乘法',
    division: '除法', mixed: '混合运算',
};
const HOMEWORK_STATUS_LABELS = {
    pending: '未完成', submitted: '已提交', graded: '已批改', overdue: '已逾期',
};
const EXAM_STATUS_LABELS = {
    not_started: '未开始', in_progress: '进行中',
    submitted: '已提交', finished: '已结束',
};
function getLevelTitle(level, short = false) {
    return (short ? SHORT_LEVEL_TITLES : LEVEL_TITLES)[level] ?? `等级${level}`;
}
function getLevelDesc(level) {
    if (level <= 2)
        return '10以内加减法';
    if (level <= 4)
        return '两位数加减法';
    if (level <= 6)
        return '乘法口诀';
    if (level <= 8)
        return '除法运算';
    return '混合运算';
}
function formatProblemType(type) {
    return PROBLEM_TYPE_LABELS[type] ?? '未知';
}
/**
 * rate 可以是 0-1 小数或 0-100 整数，统一输出 "85.3%"
 */
function formatRate(rate) {
    if (rate === null || rate === undefined)
        return '0%';
    const pct = rate <= 1 ? rate * 100 : rate;
    return `${pct.toFixed(1)}%`;
}
function getRateTone(rate) {
    const num = Number(rate) || 0;
    const pct = num <= 1 ? num * 100 : num;
    if (pct >= 85)
        return 'success';
    if (pct < 60)
        return 'danger';
    return 'primary';
}
function formatDate(date, fmt = 'YYYY-MM-DD') {
    if (!date)
        return '';
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return '';
    const pad = (n) => String(n).padStart(2, '0');
    return fmt
        .replace('YYYY', String(d.getFullYear()))
        .replace('MM', pad(d.getMonth() + 1))
        .replace('DD', pad(d.getDate()))
        .replace('HH', pad(d.getHours()))
        .replace('mm', pad(d.getMinutes()));
}
function formatDuration(seconds) {
    if (!seconds)
        return '0秒';
    if (seconds < 60)
        return `${seconds}秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}
function formatHomeworkStatus(status) {
    return HOMEWORK_STATUS_LABELS[status] ?? status;
}
function formatExamStatus(status) {
    return EXAM_STATUS_LABELS[status] ?? status;
}
function getAvatarText(userInfo) {
    const name = userInfo ? (userInfo.name || userInfo.account || '?') : '?';
    return String(name).slice(0, 1);
}
function clampPercent(value) {
    const num = Number(value) || 0;
    return Math.min(100, Math.max(0, num));
}

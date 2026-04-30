import { OperationType } from '../types/index';

const LEVEL_TITLES: Record<number, string> = {
  1: '口算萌新', 2: '数字学徒', 3: '加减能手', 4: '运算达人', 5: '乘除小侠',
  6: '混合高手', 7: '速算健将', 8: '数学精英', 9: '口算大师', 10: '传说天才',
};

const SHORT_LEVEL_TITLES: Record<number, string> = {
  1: '萌新', 2: '学徒', 3: '能手', 4: '达人', 5: '小侠',
  6: '高手', 7: '健将', 8: '精英', 9: '大师', 10: '传说',
};

const PROBLEM_TYPE_LABELS: Record<string, string> = {
  addition: '加法', subtraction: '减法', multiplication: '乘法',
  division: '除法', mixed: '混合运算',
};

const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  pending: '未完成', submitted: '已提交', graded: '已批改', overdue: '已逾期',
};

const EXAM_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始', in_progress: '进行中',
  submitted: '已提交', finished: '已结束',
};

export function getLevelTitle(level: number, short = false): string {
  return (short ? SHORT_LEVEL_TITLES : LEVEL_TITLES)[level] ?? `等级${level}`;
}

export function getLevelDesc(level: number): string {
  if (level <= 2) return '10以内加减法';
  if (level <= 4) return '两位数加减法';
  if (level <= 6) return '乘法口诀';
  if (level <= 8) return '除法运算';
  return '混合运算';
}

export function formatProblemType(type: OperationType | string): string {
  return PROBLEM_TYPE_LABELS[type] ?? '未知';
}

/**
 * rate 可以是 0-1 小数或 0-100 整数，统一输出 "85.3%"
 */
export function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '0%';
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

export function getRateTone(rate: number | null | undefined): 'success' | 'primary' | 'danger' {
  const num = Number(rate) || 0;
  const pct = num <= 1 ? num * 100 : num;
  if (pct >= 85) return 'success';
  if (pct < 60)  return 'danger';
  return 'primary';
}

export function formatDate(
  date: string | Date | null | undefined,
  fmt = 'YYYY-MM-DD',
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM',   pad(d.getMonth() + 1))
    .replace('DD',   pad(d.getDate()))
    .replace('HH',   pad(d.getHours()))
    .replace('mm',   pad(d.getMinutes()));
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '0秒';
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

export function formatHomeworkStatus(status: string): string {
  return HOMEWORK_STATUS_LABELS[status] ?? status;
}

export function formatExamStatus(status: string): string {
  return EXAM_STATUS_LABELS[status] ?? status;
}

export function getAvatarText(userInfo: { name?: string; account?: string } | null): string {
  const name = userInfo ? (userInfo.name || userInfo.account || '?') : '?';
  return String(name).slice(0, 1);
}

export function clampPercent(value: number | null | undefined): number {
  const num = Number(value) || 0;
  return Math.min(100, Math.max(0, num));
}
